begin;

alter table public.partner_reward_redemptions
  add column if not exists target_event_id uuid
    references public.business_events(id) on delete set null;

create table if not exists public.event_promotion_purchases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_id uuid not null references public.business_events(id) on delete cascade,
  purchased_by uuid not null references public.profiles(id) on delete restrict,
  duration_days integer not null check (duration_days > 0 and duration_days <= 90),
  expected_amount_cents integer not null check (expected_amount_cents > 0),
  currency text not null default 'usd'
    check (currency = lower(currency) and char_length(currency) = 3),
  status text not null default 'created'
    check (status in ('created','open','paid','simulated','failed','canceled','expired')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_livemode boolean,
  is_demo boolean not null default false,
  demo_group text,
  checkout_expires_at timestamptz,
  paid_at timestamptz,
  fulfilled_at timestamptz,
  failed_at timestamptz,
  canceled_at timestamptz,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_promotion_purchases_demo_group_valid
    check (is_demo or demo_group is null)
);

create unique index if not exists event_promotion_purchases_stripe_session_unique_idx
  on public.event_promotion_purchases (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists event_promotion_purchases_payment_intent_unique_idx
  on public.event_promotion_purchases (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create index if not exists event_promotion_purchases_event_created_idx
  on public.event_promotion_purchases (event_id, created_at desc);

create index if not exists event_promotion_purchases_business_created_idx
  on public.event_promotion_purchases (business_id, created_at desc);

alter table public.event_promotion_purchases enable row level security;
revoke all on table public.event_promotion_purchases from public, anon, authenticated;
grant select, insert, update on table public.event_promotion_purchases to service_role;

alter table public.business_event_promotions
  alter column reward_redemption_id drop not null,
  add column if not exists purchase_id uuid
    references public.event_promotion_purchases(id) on delete cascade,
  add column if not exists promotion_source text not null default 'partner_points';

alter table public.business_event_promotions
  drop constraint if exists business_event_promotions_promotion_source_check;
alter table public.business_event_promotions
  add constraint business_event_promotions_promotion_source_check
  check (promotion_source in ('partner_points','paid','demo_paid'));

create unique index if not exists business_event_promotions_purchase_unique_idx
  on public.business_event_promotions (purchase_id)
  where purchase_id is not null;

alter table public.business_event_promotions
  drop constraint if exists business_event_promotions_exactly_one_source_check;
alter table public.business_event_promotions
  add constraint business_event_promotions_exactly_one_source_check
  check (
    (reward_redemption_id is not null and purchase_id is null)
    or (reward_redemption_id is null and purchase_id is not null)
  );

update public.business_event_promotions
set promotion_source = 'partner_points'
where reward_redemption_id is not null;

update public.spotlight_campaigns spotlight
set metadata = coalesce(spotlight.metadata, '{}'::jsonb)
  || jsonb_build_object('promotion_source', 'partner_points'),
    updated_at = now()
from public.business_event_promotions promotion
where promotion.spotlight_campaign_id = spotlight.id
  and promotion.reward_redemption_id is not null
  and not (coalesce(spotlight.metadata, '{}'::jsonb) ? 'promotion_source');

create or replace function public.create_business_event_promotion_from_source(
  p_business_id uuid,
  p_event_id uuid,
  p_actor_id uuid,
  p_promotion_source text,
  p_source_id uuid,
  p_requested_ends_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.business_events%rowtype;
  v_business public.businesses%rowtype;
  v_existing public.business_event_promotions%rowtype;
  v_promotion_id uuid;
  v_promotion_end timestamptz;
  v_event_boundary timestamptz;
  v_spotlight_id uuid;
  v_spotlight_enabled boolean := true;
  v_paid boolean;
begin
  if p_promotion_source not in ('partner_points','paid','demo_paid') then
    raise exception 'Unsupported Event Promotion source.';
  end if;

  if p_source_id is null then
    raise exception 'Event Promotion source id is required.';
  end if;

  if p_promotion_source = 'partner_points' then
    select promotion.*
      into v_existing
    from public.business_event_promotions promotion
    where promotion.reward_redemption_id = p_source_id
    limit 1;
  else
    select promotion.*
      into v_existing
    from public.business_event_promotions promotion
    where promotion.purchase_id = p_source_id
    limit 1;
  end if;

  if found then
    return v_existing.id;
  end if;

  select event.*
    into v_event
  from public.business_events event
  where event.id = p_event_id
    and event.business_id = p_business_id
  for update;

  if not found then
    raise exception 'Business event was not found.';
  end if;

  select business.*
    into v_business
  from public.businesses business
  where business.id = p_business_id;

  if not found then
    raise exception 'Business was not found.';
  end if;

  v_event_boundary := coalesce(v_event.ends_at, v_event.starts_at + interval '4 hours');

  if v_event_boundary <= now() then
    raise exception 'This event has already ended.';
  end if;

  select promotion.*
    into v_existing
  from public.business_event_promotions promotion
  where promotion.event_id = p_event_id
    and promotion.starts_at <= now()
    and promotion.ends_at > now()
  order by promotion.ends_at desc
  limit 1;

  if found then
    raise exception 'Event Promotion is already active for this event.';
  end if;

  select settings.supporter_spotlight_enabled
    into v_spotlight_enabled
  from public.event_promotion_settings settings
  where settings.id = 'default';

  v_spotlight_enabled := coalesce(v_spotlight_enabled, true);
  v_promotion_end := least(
    coalesce(p_requested_ends_at, now() + interval '7 days'),
    v_event_boundary
  );

  if v_promotion_end <= now() then
    raise exception 'This event can no longer be promoted.';
  end if;

  v_paid := p_promotion_source in ('paid','demo_paid');

  if v_spotlight_enabled then
    insert into public.spotlight_campaigns (
      title,
      body,
      cta_label,
      cta_url,
      secondary_cta_label,
      secondary_cta_url,
      kind,
      audience_roles,
      environment_scope,
      target_demo_group,
      priority,
      starts_at,
      ends_at,
      is_active,
      dismissible,
      max_views_per_user,
      repeat_after_hours,
      created_by,
      source_type,
      source_id,
      metadata
    ) values (
      v_event.title,
      case
        when v_paid then 'Sponsored local event from ' || v_business.name || '. View the date, time, location, and event details.'
        else 'Featured local event from ' || v_business.name || '. View the date, time, location, and event details.'
      end,
      'View Event',
      '/events#event-' || v_event.id::text,
      'Browse Local Events',
      '/events',
      'event_promo',
      array['customer']::text[],
      case when coalesce(v_business.is_demo, false) then 'demo' else 'production' end,
      case when coalesce(v_business.is_demo, false) then v_business.demo_group else null end,
      160,
      now(),
      v_promotion_end,
      v_event.is_published and v_promotion_end > now(),
      true,
      1,
      null,
      p_actor_id,
      'business_event_promotion',
      p_source_id,
      jsonb_build_object(
        'event_id', v_event.id,
        'business_id', v_business.id,
        'business_name', v_business.name,
        'starts_at', v_event.starts_at,
        'ends_at', v_event.ends_at,
        'venue_name', v_event.venue_name,
        'address', v_event.address,
        'promotion_source', p_promotion_source
      )
    )
    on conflict (source_type, source_id)
    do update set
      title = excluded.title,
      body = excluded.body,
      cta_label = excluded.cta_label,
      cta_url = excluded.cta_url,
      secondary_cta_label = excluded.secondary_cta_label,
      secondary_cta_url = excluded.secondary_cta_url,
      kind = excluded.kind,
      audience_roles = excluded.audience_roles,
      environment_scope = excluded.environment_scope,
      target_demo_group = excluded.target_demo_group,
      priority = excluded.priority,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      is_active = excluded.is_active,
      dismissible = excluded.dismissible,
      max_views_per_user = excluded.max_views_per_user,
      repeat_after_hours = excluded.repeat_after_hours,
      metadata = excluded.metadata,
      updated_at = now()
    returning id into v_spotlight_id;
  end if;

  if p_promotion_source = 'partner_points' then
    insert into public.business_event_promotions (
      business_id,
      event_id,
      reward_redemption_id,
      purchase_id,
      promotion_source,
      spotlight_campaign_id,
      starts_at,
      ends_at
    ) values (
      p_business_id,
      p_event_id,
      p_source_id,
      null,
      'partner_points',
      v_spotlight_id,
      now(),
      v_promotion_end
    )
    returning id into v_promotion_id;
  else
    insert into public.business_event_promotions (
      business_id,
      event_id,
      reward_redemption_id,
      purchase_id,
      promotion_source,
      spotlight_campaign_id,
      starts_at,
      ends_at
    ) values (
      p_business_id,
      p_event_id,
      null,
      p_source_id,
      p_promotion_source,
      v_spotlight_id,
      now(),
      v_promotion_end
    )
    returning id into v_promotion_id;
  end if;

  return v_promotion_id;
end;
$$;

revoke all on function public.create_business_event_promotion_from_source(
  uuid, uuid, uuid, text, uuid, timestamptz
) from public, anon, authenticated, service_role;

create or replace function public.guard_event_promotion_redemption_conflicts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_event public.business_events%rowtype;
begin
  select item.code
    into v_code
  from public.partner_reward_marketplace_items item
  where item.id = new.marketplace_item_id;

  if v_code <> 'event_promotion_7d' then
    return new;
  end if;

  if new.target_event_id is not null then
    select event.*
      into v_event
    from public.business_events event
    where event.id = new.target_event_id
      and event.business_id = new.business_id
    for update;
  else
    select event.*
      into v_event
    from public.business_events event
    where event.business_id = new.business_id
      and event.is_published = true
      and event.starts_at > now()
      and event.starts_at <= now() + interval '30 days'
    order by event.starts_at asc
    limit 1
    for update;
  end if;

  if not found then
    return new;
  end if;

  if exists (
    select 1
    from public.business_event_promotions promotion
    where promotion.event_id = v_event.id
      and promotion.starts_at <= now()
      and promotion.ends_at > now()
  ) then
    raise exception 'Event Promotion is already active for this event.';
  end if;

  if exists (
    select 1
    from public.event_promotion_purchases purchase
    where purchase.event_id = v_event.id
      and purchase.status in ('created','open')
      and coalesce(
        purchase.checkout_expires_at,
        purchase.created_at + interval '35 minutes'
      ) > now()
  ) then
    raise exception 'A paid Event Promotion checkout is already open for this event.';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_event_promotion_redemption_conflicts()
  from public, anon, authenticated, service_role;

drop trigger if exists guard_event_promotion_redemption_conflicts
  on public.partner_reward_redemptions;

create trigger guard_event_promotion_redemption_conflicts
before insert on public.partner_reward_redemptions
for each row execute function public.guard_event_promotion_redemption_conflicts();

create or replace function public.redeem_partner_reward_for_event(
  p_business_id uuid,
  p_event_id uuid,
  p_actor_id uuid,
  p_idempotency_key text
)
returns table (
  redemption_id uuid,
  item_code text,
  points_spent numeric,
  starts_at timestamptz,
  ends_at timestamptz,
  remaining_eligible_points numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_period public.partner_reward_periods%rowtype;
  v_item public.partner_reward_marketplace_items%rowtype;
  v_existing public.partner_reward_redemptions%rowtype;
  v_redemption public.partner_reward_redemptions%rowtype;
  v_event public.business_events%rowtype;
  v_business public.businesses%rowtype;
  v_point_event_id uuid;
  v_earned numeric(12,2);
  v_spent numeric(12,2);
  v_available numeric(12,2);
  v_ends_at timestamptz;
begin
  if p_actor_id is null then
    raise exception 'Authentication is required.';
  end if;

  if nullif(trim(p_idempotency_key), '') is null then
    raise exception 'An idempotency key is required.';
  end if;

  select business.*
    into v_business
  from public.businesses business
  where business.id = p_business_id;

  if not found then
    raise exception 'Business was not found.';
  end if;

  if not (
    v_business.legacy_profile_id = p_actor_id
    or exists (
      select 1
      from public.business_memberships membership
      where membership.business_id = p_business_id
        and membership.user_id = p_actor_id
        and membership.status = 'active'
        and membership.membership_role in ('owner','manager')
    )
  ) then
    raise exception 'Business owner or manager access is required.';
  end if;

  select event.*
    into v_event
  from public.business_events event
  where event.id = p_event_id
    and event.business_id = p_business_id
  for update;

  if not found then
    raise exception 'Business event was not found.';
  end if;

  if not v_event.is_published
    or v_event.starts_at <= now()
    or v_event.starts_at > now() + interval '30 days' then
    raise exception 'Publish an upcoming business event within the next 30 days before using Event Promotion.';
  end if;

  if exists (
    select 1
    from public.business_event_promotions promotion
    where promotion.event_id = p_event_id
      and promotion.starts_at <= now()
      and promotion.ends_at > now()
  ) then
    raise exception 'Event Promotion is already active for this event.';
  end if;

  if exists (
    select 1
    from public.event_promotion_purchases purchase
    where purchase.event_id = p_event_id
      and purchase.status in ('created','open')
      and coalesce(
        purchase.checkout_expires_at,
        purchase.created_at + interval '35 minutes'
      ) > now()
  ) then
    raise exception 'A paid Event Promotion checkout is already open for this event.';
  end if;

  select redemption.*
    into v_existing
  from public.partner_reward_redemptions redemption
  where redemption.business_id = p_business_id
    and redemption.idempotency_key = p_idempotency_key;

  if found then
    select coalesce(sum(point_event.points), 0)
      into v_earned
    from public.partner_point_events point_event
    where point_event.business_id = p_business_id
      and point_event.eligibility_status = 'eligible'
      and point_event.event_type <> 'reward_marketplace_redemption';

    select coalesce(sum(redemption.points_spent), 0)
      into v_spent
    from public.partner_reward_redemptions redemption
    where redemption.business_id = p_business_id
      and redemption.status <> 'reversed';

    v_available := greatest(v_earned - v_spent, 0);

    return query
      select
        v_existing.id,
        item.code,
        v_existing.points_spent,
        v_existing.starts_at,
        v_existing.ends_at,
        v_available
      from public.partner_reward_marketplace_items item
      where item.id = v_existing.marketplace_item_id;
    return;
  end if;

  select period.*
    into v_period
  from public.partner_reward_periods period
  where period.status = 'open'
    and now() >= period.starts_at
    and now() < period.ends_at
  order by period.starts_at desc
  limit 1
  for update;

  if not found then
    raise exception 'There is no open Partner Rewards period.';
  end if;

  select item.*
    into v_item
  from public.partner_reward_marketplace_items item
  where item.code = 'event_promotion_7d'
    and item.is_active = true
  for update;

  if not found then
    raise exception 'This Partner Reward is not currently available.';
  end if;

  select coalesce(sum(point_event.points), 0)
    into v_earned
  from public.partner_point_events point_event
  where point_event.business_id = p_business_id
    and point_event.eligibility_status = 'eligible'
    and point_event.event_type <> 'reward_marketplace_redemption';

  select coalesce(sum(redemption.points_spent), 0)
    into v_spent
  from public.partner_reward_redemptions redemption
  where redemption.business_id = p_business_id
    and redemption.status <> 'reversed';

  v_available := greatest(v_earned - v_spent, 0);

  if v_available < v_item.point_cost then
    raise exception 'Not enough eligible Partner Points.';
  end if;

  v_ends_at := case
    when v_item.duration_days is null then null
    else now() + make_interval(days => v_item.duration_days)
  end;

  insert into public.partner_reward_redemptions (
    business_id,
    reward_period_id,
    marketplace_item_id,
    redeemed_by,
    points_spent,
    status,
    starts_at,
    ends_at,
    idempotency_key,
    benefit_snapshot,
    target_event_id
  ) values (
    p_business_id,
    v_period.id,
    v_item.id,
    p_actor_id,
    v_item.point_cost,
    'active',
    now(),
    v_ends_at,
    p_idempotency_key,
    jsonb_build_object(
      'code', v_item.code,
      'name', v_item.name,
      'category', v_item.category,
      'duration_days', v_item.duration_days,
      'benefit_config', v_item.benefit_config,
      'target_event_id', p_event_id
    ),
    p_event_id
  )
  returning * into v_redemption;

  insert into public.partner_point_events (
    business_id,
    reward_period_id,
    event_type,
    points,
    eligibility_status,
    source_type,
    source_id,
    rule_version,
    idempotency_key,
    metadata
  ) values (
    p_business_id,
    v_period.id,
    'reward_marketplace_redemption',
    -v_item.point_cost,
    'ineligible',
    'partner_reward_redemption',
    v_redemption.id::text,
    v_period.rule_version,
    'marketplace:' || v_redemption.id::text,
    jsonb_build_object(
      'item_code', v_item.code,
      'item_name', v_item.name,
      'lifetime_balance_debit', true,
      'target_event_id', p_event_id
    )
  )
  returning id into v_point_event_id;

  update public.partner_reward_redemptions
  set point_event_id = v_point_event_id,
      updated_at = now()
  where id = v_redemption.id;

  v_available := v_available - v_item.point_cost;

  return query
    select
      v_redemption.id,
      v_item.code,
      v_item.point_cost,
      v_redemption.starts_at,
      v_redemption.ends_at,
      v_available;
end;
$$;

revoke all on function public.redeem_partner_reward_for_event(
  uuid, uuid, uuid, text
) from public, anon, authenticated;
grant execute on function public.redeem_partner_reward_for_event(
  uuid, uuid, uuid, text
) to service_role;

create or replace function public.create_business_event_promotion_from_reward()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_event_id uuid;
  v_promotion_id uuid;
begin
  select item.code
    into v_code
  from public.partner_reward_marketplace_items item
  where item.id = new.marketplace_item_id;

  if v_code <> 'event_promotion_7d' then
    return new;
  end if;

  v_event_id := new.target_event_id;

  if v_event_id is null then
    select event.id
      into v_event_id
    from public.business_events event
    where event.business_id = new.business_id
      and event.is_published = true
      and event.starts_at > now()
      and event.starts_at <= now() + interval '30 days'
    order by event.starts_at asc
    limit 1;
  end if;

  if v_event_id is null then
    return new;
  end if;

  v_promotion_id := public.create_business_event_promotion_from_source(
    new.business_id,
    v_event_id,
    new.redeemed_by,
    'partner_points',
    new.id,
    new.ends_at
  );

  return new;
end;
$$;

revoke all on function public.create_business_event_promotion_from_reward()
  from public, anon, authenticated, service_role;

create or replace function public.create_event_promotion_purchase_attempt(
  p_business_id uuid,
  p_event_id uuid,
  p_purchased_by uuid,
  p_duration_days integer,
  p_expected_is_demo boolean,
  p_expected_demo_group text
)
returns table (
  purchase_id uuid,
  amount_cents integer,
  currency text,
  duration_days integer,
  is_demo boolean,
  demo_group text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business public.businesses%rowtype;
  v_event public.business_events%rowtype;
  v_price public.event_promotion_price_options%rowtype;
  v_purchase public.event_promotion_purchases%rowtype;
  v_paid_enabled boolean;
begin
  if p_purchased_by is null then
    raise exception 'Authentication is required.';
  end if;

  select business.*
    into v_business
  from public.businesses business
  where business.id = p_business_id;

  if not found then
    raise exception 'Business was not found.';
  end if;

  if coalesce(v_business.is_demo, false) <> coalesce(p_expected_is_demo, false)
    or coalesce(v_business.demo_group, '') <> coalesce(p_expected_demo_group, '') then
    raise exception 'Business environment does not match this RaiseHub app.';
  end if;

  if not (
    v_business.legacy_profile_id = p_purchased_by
    or exists (
      select 1
      from public.business_memberships membership
      where membership.business_id = p_business_id
        and membership.user_id = p_purchased_by
        and membership.status = 'active'
        and membership.membership_role in ('owner','manager')
    )
  ) then
    raise exception 'Business owner or manager access is required.';
  end if;

  select event.*
    into v_event
  from public.business_events event
  where event.id = p_event_id
    and event.business_id = p_business_id
  for update;

  if not found then
    raise exception 'Business event was not found.';
  end if;

  if coalesce(v_event.is_demo, false) <> coalesce(v_business.is_demo, false)
    or coalesce(v_event.demo_group, '') <> coalesce(v_business.demo_group, '') then
    raise exception 'Business event environment does not match its business.';
  end if;

  if not v_event.is_published or v_event.starts_at <= now() then
    raise exception 'Publish an upcoming event before promoting it.';
  end if;

  select settings.paid_enabled
    into v_paid_enabled
  from public.event_promotion_settings settings
  where settings.id = 'default';

  if coalesce(v_paid_enabled, false) is not true then
    raise exception 'Paid Event Promotion is not currently available.';
  end if;

  select option.*
    into v_price
  from public.event_promotion_price_options option
  where option.duration_days = p_duration_days
    and option.is_enabled = true
  for update;

  if not found then
    raise exception 'That Event Promotion duration is not currently available.';
  end if;

  if exists (
    select 1
    from public.business_event_promotions promotion
    where promotion.event_id = p_event_id
      and promotion.starts_at <= now()
      and promotion.ends_at > now()
  ) then
    raise exception 'Event Promotion is already active for this event.';
  end if;

  update public.event_promotion_purchases purchase
  set status = 'expired',
      updated_at = now()
  where purchase.event_id = p_event_id
    and purchase.status in ('created','open')
    and coalesce(
      purchase.checkout_expires_at,
      purchase.created_at + interval '35 minutes'
    ) <= now();

  if exists (
    select 1
    from public.event_promotion_purchases purchase
    where purchase.event_id = p_event_id
      and purchase.status in ('created','open')
      and coalesce(
        purchase.checkout_expires_at,
        purchase.created_at + interval '35 minutes'
      ) > now()
  ) then
    raise exception 'A paid Event Promotion checkout is already open for this event.';
  end if;

  insert into public.event_promotion_purchases (
    business_id,
    event_id,
    purchased_by,
    duration_days,
    expected_amount_cents,
    currency,
    status,
    is_demo,
    demo_group
  ) values (
    p_business_id,
    p_event_id,
    p_purchased_by,
    v_price.duration_days,
    v_price.price_cents,
    'usd',
    'created',
    coalesce(v_business.is_demo, false),
    v_business.demo_group
  )
  returning * into v_purchase;

  return query
    select
      v_purchase.id,
      v_purchase.expected_amount_cents,
      v_purchase.currency,
      v_purchase.duration_days,
      v_purchase.is_demo,
      v_purchase.demo_group;
end;
$$;

revoke all on function public.create_event_promotion_purchase_attempt(
  uuid, uuid, uuid, integer, boolean, text
) from public, anon, authenticated;
grant execute on function public.create_event_promotion_purchase_attempt(
  uuid, uuid, uuid, integer, boolean, text
) to service_role;

create or replace function public.fulfill_paid_event_promotion_purchase(
  p_purchase_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_amount_total_cents integer,
  p_currency text,
  p_payment_status text,
  p_stripe_livemode boolean
)
returns table (
  purchase_id uuid,
  promotion_id uuid,
  already_fulfilled boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_purchase public.event_promotion_purchases%rowtype;
  v_promotion_id uuid;
begin
  select purchase.*
    into v_purchase
  from public.event_promotion_purchases purchase
  where purchase.id = p_purchase_id
  for update;

  if not found then
    raise exception 'Event Promotion purchase was not found.';
  end if;

  if v_purchase.is_demo then
    raise exception 'Demo Event Promotion purchases cannot receive Stripe payment state.';
  end if;

  if v_purchase.stripe_checkout_session_id is null
    or v_purchase.stripe_checkout_session_id <> nullif(trim(p_stripe_checkout_session_id), '') then
    raise exception 'Stripe Checkout Session does not match the Event Promotion purchase.';
  end if;

  if v_purchase.fulfilled_at is not null then
    select promotion.id
      into v_promotion_id
    from public.business_event_promotions promotion
    where promotion.purchase_id = v_purchase.id;

    return query select v_purchase.id, v_promotion_id, true;
    return;
  end if;

  if lower(coalesce(p_payment_status, '')) not in ('paid','no_payment_required') then
    raise exception 'Event Promotion Checkout Session is not paid.';
  end if;

  if p_amount_total_cents is null
    or p_amount_total_cents <> v_purchase.expected_amount_cents then
    raise exception 'Event Promotion Checkout amount does not match the server snapshot.';
  end if;

  if lower(coalesce(p_currency, '')) <> v_purchase.currency then
    raise exception 'Event Promotion Checkout currency does not match the server snapshot.';
  end if;

  if v_purchase.stripe_livemode is not null
    and v_purchase.stripe_livemode <> p_stripe_livemode then
    raise exception 'Stripe mode does not match the Event Promotion purchase.';
  end if;

  if v_purchase.status in ('canceled','failed') then
    raise exception 'Event Promotion purchase is no longer fulfillable.';
  end if;

  v_promotion_id := public.create_business_event_promotion_from_source(
    v_purchase.business_id,
    v_purchase.event_id,
    v_purchase.purchased_by,
    'paid',
    v_purchase.id,
    now() + make_interval(days => v_purchase.duration_days)
  );

  update public.event_promotion_purchases
  set status = 'paid',
      stripe_payment_intent_id = nullif(trim(p_stripe_payment_intent_id), ''),
      stripe_livemode = p_stripe_livemode,
      paid_at = coalesce(paid_at, now()),
      fulfilled_at = now(),
      failure_message = null,
      updated_at = now()
  where id = v_purchase.id;

  return query select v_purchase.id, v_promotion_id, false;
end;
$$;

revoke all on function public.fulfill_paid_event_promotion_purchase(
  uuid, text, text, integer, text, text, boolean
) from public, anon, authenticated;
grant execute on function public.fulfill_paid_event_promotion_purchase(
  uuid, text, text, integer, text, text, boolean
) to service_role;

create or replace function public.fulfill_demo_event_promotion_purchase(
  p_purchase_id uuid
)
returns table (
  purchase_id uuid,
  promotion_id uuid,
  already_fulfilled boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_purchase public.event_promotion_purchases%rowtype;
  v_promotion_id uuid;
begin
  select purchase.*
    into v_purchase
  from public.event_promotion_purchases purchase
  where purchase.id = p_purchase_id
  for update;

  if not found then
    raise exception 'Event Promotion purchase was not found.';
  end if;

  if not v_purchase.is_demo or v_purchase.demo_group is null then
    raise exception 'Only Demo Event Promotion purchases can be simulated.';
  end if;

  if v_purchase.fulfilled_at is not null then
    select promotion.id
      into v_promotion_id
    from public.business_event_promotions promotion
    where promotion.purchase_id = v_purchase.id;

    return query select v_purchase.id, v_promotion_id, true;
    return;
  end if;

  v_promotion_id := public.create_business_event_promotion_from_source(
    v_purchase.business_id,
    v_purchase.event_id,
    v_purchase.purchased_by,
    'demo_paid',
    v_purchase.id,
    now() + make_interval(days => v_purchase.duration_days)
  );

  update public.event_promotion_purchases
  set status = 'simulated',
      paid_at = coalesce(paid_at, now()),
      fulfilled_at = now(),
      failure_message = null,
      updated_at = now()
  where id = v_purchase.id;

  return query select v_purchase.id, v_promotion_id, false;
end;
$$;

revoke all on function public.fulfill_demo_event_promotion_purchase(uuid)
  from public, anon, authenticated;
grant execute on function public.fulfill_demo_event_promotion_purchase(uuid)
  to service_role;

create or replace function public.sync_business_event_spotlight()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business public.businesses%rowtype;
  v_event_boundary timestamptz;
begin
  select business.*
    into v_business
  from public.businesses business
  where business.id = new.business_id;

  v_event_boundary := coalesce(new.ends_at, new.starts_at + interval '4 hours');

  update public.business_event_promotions promotion
  set ends_at = least(promotion.ends_at, v_event_boundary)
  where promotion.event_id = new.id
    and promotion.ends_at > v_event_boundary;

  update public.spotlight_campaigns spotlight
  set title = new.title,
      body = case
        when coalesce(spotlight.metadata->>'promotion_source', 'partner_points') in ('paid','demo_paid')
          then 'Sponsored local event from ' || coalesce(v_business.name, 'a RaiseHub Community Partner') || '. View the date, time, location, and event details.'
        else 'Featured local event from ' || coalesce(v_business.name, 'a RaiseHub Community Partner') || '. View the date, time, location, and event details.'
      end,
      cta_url = '/events#event-' || new.id::text,
      ends_at = promotion.ends_at,
      is_active = new.is_published
        and promotion.ends_at > now(),
      metadata = coalesce(spotlight.metadata, '{}'::jsonb) || jsonb_build_object(
        'event_id', new.id,
        'business_id', new.business_id,
        'business_name', coalesce(v_business.name, 'Local Business'),
        'starts_at', new.starts_at,
        'ends_at', new.ends_at,
        'venue_name', new.venue_name,
        'address', new.address,
        'promotion_source', promotion.promotion_source
      ),
      updated_at = now()
  from public.business_event_promotions promotion
  where promotion.event_id = new.id
    and promotion.spotlight_campaign_id = spotlight.id;

  return new;
end;
$$;

revoke all on function public.sync_business_event_spotlight()
  from public, anon, authenticated, service_role;

comment on table public.event_promotion_purchases is
  'Service-managed ledger for paid and safely simulated Event Promotion checkout attempts.';
comment on column public.business_event_promotions.promotion_source is
  'How the active event placement was funded: Partner Points, paid Stripe Checkout, or Demo simulation.';
comment on column public.partner_reward_redemptions.target_event_id is
  'Optional exact event target used by business-facing Event Promotion redemption.';

commit;
