begin;

create table if not exists public.business_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  description text,
  venue_name text,
  address text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  external_url text,
  is_published boolean not null default false,
  is_demo boolean not null default false,
  demo_group text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_events_title_not_blank check (nullif(trim(title), '') is not null),
  constraint business_events_valid_window check (ends_at is null or ends_at > starts_at)
);

create index if not exists business_events_business_start_idx
  on public.business_events (business_id, starts_at);
create index if not exists business_events_public_start_idx
  on public.business_events (is_published, starts_at);
create index if not exists business_events_environment_idx
  on public.business_events (is_demo, demo_group, starts_at);

create table if not exists public.business_event_promotions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_id uuid not null references public.business_events(id) on delete cascade,
  reward_redemption_id uuid not null unique references public.partner_reward_redemptions(id) on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint business_event_promotions_valid_window check (ends_at > starts_at)
);

create index if not exists business_event_promotions_event_active_idx
  on public.business_event_promotions (event_id, starts_at, ends_at);
create index if not exists business_event_promotions_business_active_idx
  on public.business_event_promotions (business_id, starts_at, ends_at);

alter table public.business_events enable row level security;
alter table public.business_event_promotions enable row level security;

revoke all on table public.business_events from anon, authenticated;
grant select on table public.business_events to anon, authenticated;
grant insert, update, delete on table public.business_events to authenticated;

revoke all on table public.business_event_promotions from anon, authenticated;
grant select on table public.business_event_promotions to anon, authenticated;

drop policy if exists business_events_public_read on public.business_events;
create policy business_events_public_read
  on public.business_events
  for select
  to anon, authenticated
  using (
    is_published = true
    or public.is_owner()
    or exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = business_events.business_id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
    )
  );

drop policy if exists business_events_member_insert on public.business_events;
create policy business_events_member_insert
  on public.business_events
  for insert
  to authenticated
  with check (
    public.is_owner()
    or exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = business_events.business_id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
        and bm.membership_role in ('owner', 'manager')
    )
  );

drop policy if exists business_events_member_update on public.business_events;
create policy business_events_member_update
  on public.business_events
  for update
  to authenticated
  using (
    public.is_owner()
    or exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = business_events.business_id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
        and bm.membership_role in ('owner', 'manager')
    )
  )
  with check (
    public.is_owner()
    or exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = business_events.business_id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
        and bm.membership_role in ('owner', 'manager')
    )
  );

drop policy if exists business_events_member_delete on public.business_events;
create policy business_events_member_delete
  on public.business_events
  for delete
  to authenticated
  using (
    public.is_owner()
    or exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = business_events.business_id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
        and bm.membership_role in ('owner', 'manager')
    )
  );

drop policy if exists business_event_promotions_public_read on public.business_event_promotions;
create policy business_event_promotions_public_read
  on public.business_event_promotions
  for select
  to anon, authenticated
  using (true);

create or replace function public.set_business_event_environment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_demo boolean;
  v_demo_group text;
begin
  select business.is_demo, business.demo_group
    into v_is_demo, v_demo_group
  from public.businesses business
  where business.id = new.business_id;

  if not found then
    raise exception 'Business was not found.';
  end if;

  new.is_demo := coalesce(v_is_demo, false);
  new.demo_group := v_demo_group;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_business_event_environment
  on public.business_events;

create trigger set_business_event_environment
before insert or update of business_id, title, description, venue_name, address, starts_at, ends_at, external_url, is_published
on public.business_events
for each row
execute function public.set_business_event_environment();

update public.partner_reward_marketplace_items
set description = 'Feature your next qualifying published business event in RaiseHub Local Events for up to 7 days.',
    benefit_config = coalesce(benefit_config, '{}'::jsonb)
      || '{"promotion_type":"event","non_stackable":true}'::jsonb,
    is_active = true,
    updated_at = now()
where code = 'event_promotion_7d';

create or replace function public.validate_partner_reward_redemption_eligibility()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_code text;
  v_tier text;
begin
  select code
    into v_code
  from public.partner_reward_marketplace_items
  where id = new.marketplace_item_id;

  if v_code = 'extra_offer_slot_30d' then
    select subscription_tier
      into v_tier
    from public.businesses
    where id = new.business_id;

    if v_tier = 'growth' then
      raise exception 'Growth plan businesses already have expanded offer capacity.';
    end if;
  end if;

  if v_code = 'website_branding_free_90d' and not exists (
    select 1
    from public.business_sites site
    where site.business_id = new.business_id
      and site.is_published = true
  ) then
    raise exception 'Publish your RaiseHub website before redeeming this reward.';
  end if;

  if v_code = 'event_promotion_7d' and not exists (
    select 1
    from public.business_events event
    where event.business_id = new.business_id
      and event.is_published = true
      and event.starts_at > now()
      and event.starts_at <= now() + interval '30 days'
  ) then
    raise exception 'Publish an upcoming business event within the next 30 days before using Event Promotion.';
  end if;

  return new;
end;
$$;

create or replace function public.create_business_event_promotion_from_reward()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_event public.business_events%rowtype;
  v_promotion_end timestamptz;
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

  v_promotion_end := coalesce(new.ends_at, now() + interval '7 days');

  if v_event.ends_at is not null then
    v_promotion_end := least(v_promotion_end, v_event.ends_at);
  elsif v_event.starts_at < v_promotion_end then
    v_promotion_end := least(v_promotion_end, v_event.starts_at + interval '4 hours');
  end if;

  if v_promotion_end <= now() then
    v_promotion_end := coalesce(new.ends_at, now() + interval '7 days');
  end if;

  insert into public.business_event_promotions (
    business_id,
    event_id,
    reward_redemption_id,
    starts_at,
    ends_at
  ) values (
    new.business_id,
    v_event.id,
    new.id,
    new.starts_at,
    v_promotion_end
  )
  on conflict (reward_redemption_id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_business_event_promotion_from_reward
  on public.partner_reward_redemptions;

create trigger create_business_event_promotion_from_reward
after insert on public.partner_reward_redemptions
for each row
execute function public.create_business_event_promotion_from_reward();

comment on table public.business_events is
  'Business-managed public events that can be surfaced in RaiseHub discovery.';
comment on table public.business_event_promotions is
  'Active event placements created by Event Promotion Partner Reward redemptions.';

commit;
