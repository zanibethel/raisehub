begin;

create table if not exists public.event_promotion_settings (
  id text primary key default 'default',
  paid_enabled boolean not null default true,
  default_paid_duration_days integer not null default 7
    check (default_paid_duration_days > 0 and default_paid_duration_days <= 90),
  partner_points_enabled boolean not null default true,
  partner_point_cost integer not null default 600
    check (partner_point_cost > 0 and partner_point_cost <= 100000),
  partner_point_duration_days integer not null default 7
    check (partner_point_duration_days > 0 and partner_point_duration_days <= 90),
  supporter_spotlight_enabled boolean not null default true,
  local_events_featured_enabled boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_promotion_price_options (
  id uuid primary key default gen_random_uuid(),
  duration_days integer not null
    check (duration_days > 0 and duration_days <= 90),
  price_cents integer not null
    check (price_cents > 0 and price_cents <= 100000),
  is_enabled boolean not null default true,
  sort_order integer not null default 100,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (duration_days)
);

alter table public.event_promotion_settings enable row level security;
alter table public.event_promotion_price_options enable row level security;

revoke all on table public.event_promotion_settings from public, anon, authenticated;
revoke all on table public.event_promotion_price_options from public, anon, authenticated;
grant select, insert, update, delete on table public.event_promotion_settings to service_role;
grant select, insert, update, delete on table public.event_promotion_price_options to service_role;

insert into public.event_promotion_settings (
  id,
  paid_enabled,
  default_paid_duration_days,
  partner_points_enabled,
  partner_point_cost,
  partner_point_duration_days,
  supporter_spotlight_enabled,
  local_events_featured_enabled
)
values (
  'default',
  true,
  7,
  true,
  600,
  7,
  true,
  true
)
on conflict (id) do nothing;

insert into public.event_promotion_price_options (
  duration_days,
  price_cents,
  is_enabled,
  sort_order
)
values
  (3, 299, true, 10),
  (7, 499, true, 20),
  (14, 799, true, 30)
on conflict (duration_days) do nothing;

create or replace function public.touch_event_promotion_settings()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.touch_event_promotion_settings()
  from public, anon, authenticated;

drop trigger if exists event_promotion_settings_touch_updated_at
  on public.event_promotion_settings;

create trigger event_promotion_settings_touch_updated_at
before update on public.event_promotion_settings
for each row execute function public.touch_event_promotion_settings();

drop trigger if exists event_promotion_price_options_touch_updated_at
  on public.event_promotion_price_options;

create trigger event_promotion_price_options_touch_updated_at
before update on public.event_promotion_price_options
for each row execute function public.touch_event_promotion_settings();

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
  v_spotlight_enabled boolean := true;
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

  select settings.supporter_spotlight_enabled
    into v_spotlight_enabled
  from public.event_promotion_settings settings
  where settings.id = 'default';

  v_spotlight_enabled := coalesce(v_spotlight_enabled, true);
  v_promotion_end := coalesce(new.ends_at, now() + interval '7 days');

  if v_event.ends_at is not null then
    v_promotion_end := least(v_promotion_end, v_event.ends_at);
  elsif v_event.starts_at < v_promotion_end then
    v_promotion_end := least(v_promotion_end, v_event.starts_at + interval '4 hours');
  end if;

  if v_promotion_end <= now() then
    v_promotion_end := coalesce(new.ends_at, now() + interval '7 days');
  end if;

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
  end if;

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

comment on table public.event_promotion_settings is
  'Owner-managed global Event Promotion behavior, Partner Point pricing, and placement controls.';
comment on table public.event_promotion_price_options is
  'Owner-managed paid Event Promotion duration and price options.';

commit;
