begin;

alter table public.spotlight_campaigns
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists target_demo_group text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.business_event_promotions
  add column if not exists spotlight_campaign_id uuid
    references public.spotlight_campaigns(id) on delete set null;

alter table public.spotlight_campaigns
  drop constraint if exists spotlight_campaigns_kind_check;

alter table public.spotlight_campaigns
  add constraint spotlight_campaigns_kind_check
  check (
    kind in (
      'announcement',
      'upgrade',
      'business_promo',
      'organization_promo',
      'event_promo',
      'system'
    )
  );

create unique index if not exists spotlight_campaigns_source_unique_idx
  on public.spotlight_campaigns (source_type, source_id);

create index if not exists spotlight_campaigns_demo_group_idx
  on public.spotlight_campaigns (target_demo_group)
  where target_demo_group is not null;

create index if not exists business_event_promotions_spotlight_idx
  on public.business_event_promotions (spotlight_campaign_id)
  where spotlight_campaign_id is not null;

update public.partner_reward_marketplace_items
set description = 'Feature your next qualifying published business event in RaiseHub Local Events and show it to supporters as a one-time Featured Local Event Spotlight for up to 7 days.',
    updated_at = now()
where code = 'event_promotion_7d';

create or replace function public.create_business_event_promotion_from_reward()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_event public.business_events%rowtype;
  v_business public.businesses%rowtype;
  v_promotion_end timestamptz;
  v_spotlight_id uuid;
begin
  select item.code
    into v_code
  from public.partner_reward_marketplace_items item
  where item.id = new.marketplace_item_id;

  if v_code <> 'event_promotion_7d' then
    return new;
  end if;

  select event.*
    into v_event
  from public.business_events event
  where event.business_id = new.business_id
    and event.is_published = true
    and event.starts_at > now()
    and event.starts_at <= now() + interval '30 days'
  order by event.starts_at asc
  limit 1;

  if not found then
    return new;
  end if;

  select business.*
    into v_business
  from public.businesses business
  where business.id = new.business_id;

  if not found then
    return new;
  end if;

  v_promotion_end := coalesce(new.ends_at, now() + interval '7 days');

  if v_event.ends_at is not null then
    v_promotion_end := least(v_promotion_end, v_event.ends_at);
  elsif v_event.starts_at < v_promotion_end then
    v_promotion_end := least(v_promotion_end, v_event.starts_at + interval '4 hours');
  end if;

  if v_promotion_end <= now() then
    v_promotion_end := coalesce(new.ends_at, now() + interval '7 days');
  end if;

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
    'Featured local event from ' || v_business.name || '. View the date, time, location, and event details.',
    'View Event',
    '/events#event-' || v_event.id::text,
    'Browse Local Events',
    '/events',
    'event_promo',
    array['customer']::text[],
    case when coalesce(v_business.is_demo, false) then 'demo' else 'production' end,
    case when coalesce(v_business.is_demo, false) then v_business.demo_group else null end,
    160,
    new.starts_at,
    v_promotion_end,
    true,
    true,
    1,
    null,
    new.redeemed_by,
    'business_event_promotion',
    new.id,
    jsonb_build_object(
      'event_id', v_event.id,
      'business_id', v_business.id,
      'business_name', v_business.name,
      'starts_at', v_event.starts_at,
      'ends_at', v_event.ends_at,
      'venue_name', v_event.venue_name,
      'address', v_event.address
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

  insert into public.business_event_promotions (
    business_id,
    event_id,
    reward_redemption_id,
    spotlight_campaign_id,
    starts_at,
    ends_at
  ) values (
    new.business_id,
    v_event.id,
    new.id,
    v_spotlight_id,
    new.starts_at,
    v_promotion_end
  )
  on conflict (reward_redemption_id)
  do update set
    event_id = excluded.event_id,
    spotlight_campaign_id = excluded.spotlight_campaign_id,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at;

  return new;
end;
$$;

revoke all on function public.create_business_event_promotion_from_reward()
  from public, anon, authenticated;

create or replace function public.sync_business_event_spotlight()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business public.businesses%rowtype;
begin
  select business.*
    into v_business
  from public.businesses business
  where business.id = new.business_id;

  update public.spotlight_campaigns spotlight
  set title = new.title,
      body = 'Featured local event from ' || coalesce(v_business.name, 'a RaiseHub Community Partner') || '. View the date, time, location, and event details.',
      cta_url = '/events#event-' || new.id::text,
      is_active = new.is_published
        and spotlight.ends_at is not null
        and spotlight.ends_at > now(),
      metadata = coalesce(spotlight.metadata, '{}'::jsonb) || jsonb_build_object(
        'event_id', new.id,
        'business_id', new.business_id,
        'business_name', coalesce(v_business.name, 'Local Business'),
        'starts_at', new.starts_at,
        'ends_at', new.ends_at,
        'venue_name', new.venue_name,
        'address', new.address
      ),
      updated_at = now()
  from public.business_event_promotions promotion
  where promotion.event_id = new.id
    and promotion.spotlight_campaign_id = spotlight.id;

  return new;
end;
$$;

revoke all on function public.sync_business_event_spotlight()
  from public, anon, authenticated;

drop trigger if exists sync_business_event_spotlight
  on public.business_events;

create trigger sync_business_event_spotlight
after update of title, description, venue_name, address, starts_at, ends_at, external_url, is_published
on public.business_events
for each row
execute function public.sync_business_event_spotlight();

create or replace function public.cleanup_business_event_promotion_spotlight()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.spotlight_campaign_id is not null then
    delete from public.spotlight_campaigns
    where id = old.spotlight_campaign_id;
  end if;

  return old;
end;
$$;

revoke all on function public.cleanup_business_event_promotion_spotlight()
  from public, anon, authenticated;

drop trigger if exists cleanup_business_event_promotion_spotlight
  on public.business_event_promotions;

create trigger cleanup_business_event_promotion_spotlight
after delete on public.business_event_promotions
for each row
execute function public.cleanup_business_event_promotion_spotlight();

-- Backfill an active Spotlight for any event promotion that was redeemed before
-- this migration. Existing rows are linked to the generated campaign.
with promotion_rows as (
  select
    promotion.id as promotion_id,
    promotion.reward_redemption_id,
    promotion.business_id,
    promotion.event_id,
    promotion.starts_at as promotion_starts_at,
    promotion.ends_at as promotion_ends_at,
    redemption.redeemed_by,
    event.title,
    event.starts_at as event_starts_at,
    event.ends_at as event_ends_at,
    event.venue_name,
    event.address,
    event.is_published,
    business.name as business_name,
    business.is_demo,
    business.demo_group
  from public.business_event_promotions promotion
  join public.partner_reward_redemptions redemption
    on redemption.id = promotion.reward_redemption_id
  join public.business_events event
    on event.id = promotion.event_id
  join public.businesses business
    on business.id = promotion.business_id
  where promotion.spotlight_campaign_id is null
),
inserted as (
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
  )
  select
    row.title,
    'Featured local event from ' || row.business_name || '. View the date, time, location, and event details.',
    'View Event',
    '/events#event-' || row.event_id::text,
    'Browse Local Events',
    '/events',
    'event_promo',
    array['customer']::text[],
    case when coalesce(row.is_demo, false) then 'demo' else 'production' end,
    case when coalesce(row.is_demo, false) then row.demo_group else null end,
    160,
    row.promotion_starts_at,
    row.promotion_ends_at,
    row.is_published and row.promotion_ends_at > now(),
    true,
    1,
    null,
    row.redeemed_by,
    'business_event_promotion',
    row.reward_redemption_id,
    jsonb_build_object(
      'event_id', row.event_id,
      'business_id', row.business_id,
      'business_name', row.business_name,
      'starts_at', row.event_starts_at,
      'ends_at', row.event_ends_at,
      'venue_name', row.venue_name,
      'address', row.address
    )
  from promotion_rows row
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
    metadata = excluded.metadata,
    updated_at = now()
  returning id, source_id
)
update public.business_event_promotions promotion
set spotlight_campaign_id = inserted.id
from inserted
where promotion.reward_redemption_id = inserted.source_id;

comment on column public.spotlight_campaigns.source_type is
  'Optional trusted source type for automatically generated Spotlight campaigns.';
comment on column public.spotlight_campaigns.source_id is
  'Optional source record identifier used to make automated Spotlight creation idempotent.';
comment on column public.spotlight_campaigns.target_demo_group is
  'Optional demo-group scope. Demo Spotlights with a value here only display inside that demo group.';
comment on column public.spotlight_campaigns.metadata is
  'Structured context used by specialized Spotlight presentation such as event date, venue, and business.';

commit;
