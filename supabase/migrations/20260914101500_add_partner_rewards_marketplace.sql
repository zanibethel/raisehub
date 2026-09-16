-- Partner Rewards Marketplace
-- Allows eligible Partner Points to be exchanged for internal RaiseHub benefits.
-- Points spent here are deducted from the same quarterly point ledger, so they
-- no longer contribute to the business's share of the quarter-end reward pool.

create table if not exists public.partner_reward_marketplace_items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  category text not null check (category in ('offer_capacity', 'promotion', 'premium_feature')),
  point_cost numeric(12,2) not null check (point_cost > 0),
  duration_days integer null check (duration_days is null or duration_days > 0),
  benefit_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  reward_period_id uuid not null references public.partner_reward_periods(id) on delete restrict,
  marketplace_item_id uuid not null references public.partner_reward_marketplace_items(id) on delete restrict,
  redeemed_by uuid not null references public.profiles(id) on delete restrict,
  points_spent numeric(12,2) not null check (points_spent > 0),
  status text not null default 'active' check (status in ('active', 'expired', 'reversed')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz null,
  point_event_id uuid null references public.partner_point_events(id) on delete restrict,
  idempotency_key text not null,
  benefit_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, idempotency_key)
);

create index if not exists partner_reward_redemptions_business_status_idx
  on public.partner_reward_redemptions (business_id, status, ends_at);
create index if not exists partner_reward_redemptions_period_idx
  on public.partner_reward_redemptions (reward_period_id);
create index if not exists partner_reward_redemptions_item_idx
  on public.partner_reward_redemptions (marketplace_item_id);
create index if not exists partner_reward_redemptions_redeemed_by_idx
  on public.partner_reward_redemptions (redeemed_by);
create index if not exists partner_reward_redemptions_point_event_idx
  on public.partner_reward_redemptions (point_event_id);

alter table public.partner_reward_marketplace_items enable row level security;
alter table public.partner_reward_redemptions enable row level security;

revoke all on public.partner_reward_marketplace_items from anon;
revoke all on public.partner_reward_marketplace_items from authenticated;
grant select on public.partner_reward_marketplace_items to authenticated;

revoke all on public.partner_reward_redemptions from anon;
revoke all on public.partner_reward_redemptions from authenticated;
grant select on public.partner_reward_redemptions to authenticated;

create policy "Authenticated users can view reward marketplace"
  on public.partner_reward_marketplace_items
  for select
  to authenticated
  using (true);

create policy "Business members can view their reward redemptions"
  on public.partner_reward_redemptions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = partner_reward_redemptions.business_id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
    )
  );

insert into public.partner_reward_marketplace_items
  (code, name, description, category, point_cost, duration_days, benefit_config, is_active, sort_order)
values
  (
    'extra_offer_slot_30d',
    'Extra Offer Slot',
    'Add one additional active offer slot for 30 days.',
    'offer_capacity',
    250,
    30,
    '{"extra_offer_slots":1}'::jsonb,
    true,
    10
  ),
  (
    'featured_offer_7d',
    'Featured Offer',
    'Feature one qualifying offer for 7 days once featured placement launches.',
    'promotion',
    400,
    7,
    '{"promotion_type":"featured_offer"}'::jsonb,
    false,
    20
  ),
  (
    'event_promotion_7d',
    'Event Promotion',
    'Promote a qualifying business event for 7 days once event promotion launches.',
    'promotion',
    600,
    7,
    '{"promotion_type":"event"}'::jsonb,
    false,
    30
  )
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  point_cost = excluded.point_cost,
  duration_days = excluded.duration_days,
  benefit_config = excluded.benefit_config,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

create or replace function public.redeem_partner_reward(
  p_business_id uuid,
  p_item_code text,
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
  v_user_id uuid := auth.uid();
  v_period public.partner_reward_periods%rowtype;
  v_item public.partner_reward_marketplace_items%rowtype;
  v_existing public.partner_reward_redemptions%rowtype;
  v_redemption public.partner_reward_redemptions%rowtype;
  v_event_id uuid;
  v_available numeric(12,2);
  v_ends_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if nullif(trim(p_idempotency_key), '') is null then
    raise exception 'An idempotency key is required.';
  end if;

  if not exists (
    select 1
    from public.business_memberships bm
    where bm.business_id = p_business_id
      and bm.user_id = v_user_id
      and bm.status = 'active'
      and bm.membership_role in ('owner', 'manager')
  ) then
    raise exception 'Business owner or manager access is required.';
  end if;

  select * into v_existing
  from public.partner_reward_redemptions prr
  where prr.business_id = p_business_id
    and prr.idempotency_key = p_idempotency_key;

  if found then
    select coalesce(sum(ppe.points), 0)
      into v_available
    from public.partner_point_events ppe
    where ppe.business_id = p_business_id
      and ppe.reward_period_id = v_existing.reward_period_id
      and ppe.eligibility_status = 'eligible';

    return query
      select
        v_existing.id,
        pri.code,
        v_existing.points_spent,
        v_existing.starts_at,
        v_existing.ends_at,
        v_available
      from public.partner_reward_marketplace_items pri
      where pri.id = v_existing.marketplace_item_id;
    return;
  end if;

  select * into v_period
  from public.partner_reward_periods prp
  where prp.status = 'open'
    and now() >= prp.starts_at
    and now() < prp.ends_at
  order by prp.starts_at desc
  limit 1
  for update;

  if not found then
    raise exception 'There is no open Partner Rewards period.';
  end if;

  select * into v_item
  from public.partner_reward_marketplace_items pri
  where pri.code = p_item_code
    and pri.is_active = true
  for update;

  if not found then
    raise exception 'This Partner Reward is not currently available.';
  end if;

  select coalesce(sum(ppe.points), 0)
    into v_available
  from public.partner_point_events ppe
  where ppe.business_id = p_business_id
    and ppe.reward_period_id = v_period.id
    and ppe.eligibility_status = 'eligible';

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
    benefit_snapshot
  ) values (
    p_business_id,
    v_period.id,
    v_item.id,
    v_user_id,
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
      'benefit_config', v_item.benefit_config
    )
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
    'eligible',
    'partner_reward_redemption',
    v_redemption.id::text,
    v_period.rule_version,
    'marketplace:' || v_redemption.id::text,
    jsonb_build_object('item_code', v_item.code, 'item_name', v_item.name)
  )
  returning id into v_event_id;

  update public.partner_reward_redemptions
  set point_event_id = v_event_id,
      updated_at = now()
  where id = v_redemption.id;

  v_available := v_available - v_item.point_cost;

  return query select
    v_redemption.id,
    v_item.code,
    v_item.point_cost,
    v_redemption.starts_at,
    v_redemption.ends_at,
    v_available;
end;
$$;

revoke all on function public.redeem_partner_reward(uuid, text, text) from public;
revoke all on function public.redeem_partner_reward(uuid, text, text) from anon;
grant execute on function public.redeem_partner_reward(uuid, text, text) to authenticated;
