begin;

create extension if not exists pgcrypto;

create table if not exists public.campaign_sellers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  display_name text not null,
  referral_code text not null unique,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'revoked', 'removed', 'suspended')),
  seller_profile_id uuid references public.seller_profiles(id) on delete set null,
  campaign_membership_id uuid references public.campaign_memberships(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz,
  removed_at timestamptz,
  constraint campaign_sellers_name_not_blank check (btrim(display_name) <> '')
);

create unique index if not exists campaign_sellers_campaign_name_unique_idx
  on public.campaign_sellers(campaign_id, lower(display_name));
create index if not exists campaign_sellers_campaign_status_idx
  on public.campaign_sellers(campaign_id, status, display_name);
create index if not exists campaign_sellers_org_idx
  on public.campaign_sellers(organization_id, campaign_id);

alter table public.checkout_attempts
  add column if not exists campaign_seller_id uuid
    references public.campaign_sellers(id) on delete set null,
  add column if not exists campaign_seller_name_snapshot text;

alter table public.campaign_purchases
  add column if not exists campaign_seller_id uuid
    references public.campaign_sellers(id) on delete set null,
  add column if not exists campaign_seller_name_snapshot text;

create index if not exists checkout_attempts_campaign_seller_idx
  on public.checkout_attempts(campaign_seller_id)
  where campaign_seller_id is not null;
create index if not exists campaign_purchases_campaign_seller_idx
  on public.campaign_purchases(campaign_seller_id)
  where campaign_seller_id is not null;

alter table public.campaign_sellers enable row level security;
revoke all on table public.campaign_sellers from public, anon, authenticated;
grant select, insert, update on table public.campaign_sellers to service_role;

create policy campaign_sellers_select_authorized
  on public.campaign_sellers
  for select
  to authenticated
  using (
    public.is_owner()
    or exists (
      select 1
      from public.organization_memberships om
      where om.organization_id = campaign_sellers.organization_id
        and om.user_id = (select auth.uid())
        and om.status = 'active'
        and om.membership_role in ('admin', 'manager')
    )
    or exists (
      select 1
      from public.seller_profiles sp
      where sp.id = campaign_sellers.seller_profile_id
        and sp.user_id = (select auth.uid())
    )
  );

grant select on table public.campaign_sellers to authenticated;

create or replace function public.is_campaign_roster_manager(
  p_campaign_id uuid,
  p_actor_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_owner()
    or exists (
      select 1
      from public.campaigns c
      join public.organization_memberships om
        on om.organization_id = c.organization_id
      where c.id = p_campaign_id
        and om.user_id = p_actor_profile_id
        and om.status = 'active'
        and om.membership_role in ('admin', 'manager')
    );
$$;

create or replace function public.create_campaign_sellers(
  p_campaign_id uuid,
  p_actor_profile_id uuid,
  p_names text[]
)
returns table(
  campaign_seller_id uuid,
  display_name text,
  referral_code text,
  status text,
  created boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_name text;
  v_code text;
  v_row public.campaign_sellers%rowtype;
begin
  select organization_id into v_org_id
  from public.campaigns
  where id = p_campaign_id;

  if v_org_id is null then raise exception 'Campaign not found.'; end if;
  if not public.is_campaign_roster_manager(p_campaign_id, p_actor_profile_id) then
    raise exception 'Organization administrator access is required.';
  end if;
  if coalesce(array_length(p_names, 1), 0) = 0 then
    raise exception 'At least one seller name is required.';
  end if;

  foreach v_name in array p_names loop
    v_name := nullif(btrim(v_name), '');
    if v_name is null then continue; end if;

    select * into v_row
    from public.campaign_sellers cs
    where cs.campaign_id = p_campaign_id
      and lower(cs.display_name) = lower(v_name)
    limit 1;

    if v_row.id is null then
      loop
        v_code := lower(substr(encode(gen_random_bytes(10), 'hex'), 1, 14));
        exit when not exists (
          select 1 from public.campaign_sellers where referral_code = v_code
        );
      end loop;

      insert into public.campaign_sellers (
        organization_id, campaign_id, display_name, referral_code, created_by
      ) values (
        v_org_id, p_campaign_id, v_name, v_code, p_actor_profile_id
      ) returning * into v_row;
      created := true;
    else
      created := false;
    end if;

    campaign_seller_id := v_row.id;
    display_name := v_row.display_name;
    referral_code := v_row.referral_code;
    status := v_row.status;
    return next;
  end loop;
end;
$$;

create or replace function public.update_campaign_seller(
  p_campaign_seller_id uuid,
  p_actor_profile_id uuid,
  p_display_name text default null,
  p_status text default null
)
returns public.campaign_sellers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.campaign_sellers%rowtype;
  v_next_status text;
begin
  select * into v_row
  from public.campaign_sellers
  where id = p_campaign_seller_id
  for update;

  if v_row.id is null then raise exception 'Campaign seller not found.'; end if;
  if not public.is_campaign_roster_manager(v_row.campaign_id, p_actor_profile_id) then
    raise exception 'Organization administrator access is required.';
  end if;

  v_next_status := coalesce(p_status, v_row.status);
  if v_next_status not in ('active', 'inactive', 'revoked', 'removed', 'suspended') then
    raise exception 'Invalid seller status.';
  end if;

  update public.campaign_sellers
  set display_name = coalesce(nullif(btrim(p_display_name), ''), display_name),
      status = v_next_status,
      disabled_at = case
        when v_next_status = 'active' then null
        when status = 'active' then now()
        else disabled_at
      end,
      removed_at = case
        when v_next_status = 'removed' then coalesce(removed_at, now())
        else removed_at
      end,
      updated_at = now()
  where id = p_campaign_seller_id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.list_campaign_sellers(
  p_campaign_id uuid,
  p_actor_profile_id uuid
)
returns table(
  id uuid,
  display_name text,
  referral_code text,
  status text,
  seller_profile_id uuid,
  account_claimed boolean,
  passes_sold bigint,
  gross_sales numeric,
  organization_earnings numeric,
  last_sale_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_campaign_roster_manager(p_campaign_id, p_actor_profile_id) then
    raise exception 'Organization administrator access is required.';
  end if;

  return query
  select
    cs.id,
    cs.display_name,
    cs.referral_code,
    cs.status,
    cs.seller_profile_id,
    cs.seller_profile_id is not null,
    count(cp.id)::bigint,
    coalesce(sum(cp.amount_paid), 0)::numeric,
    coalesce(sum(cp.organization_earnings), 0)::numeric,
    max(cp.created_at),
    cs.created_at
  from public.campaign_sellers cs
  left join public.campaign_purchases cp
    on cp.campaign_seller_id = cs.id
  where cs.campaign_id = p_campaign_id
  group by cs.id
  order by lower(cs.display_name), cs.created_at;
end;
$$;

create or replace function public.get_public_campaign_sellers(p_campaign_id uuid)
returns table(id uuid, display_name text, referral_code text)
language sql
stable
security definer
set search_path = public
as $$
  select cs.id, cs.display_name, cs.referral_code
  from public.campaign_sellers cs
  join public.campaigns c on c.id = cs.campaign_id
  where cs.campaign_id = p_campaign_id
    and cs.status = 'active'
    and c.status = 'active'
  order by lower(cs.display_name);
$$;

create or replace function public.resolve_campaign_seller_referral(
  p_campaign_id uuid,
  p_referral_code text
)
returns table(
  campaign_seller_id uuid,
  display_name text,
  valid_for_attribution boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select cs.id, cs.display_name, cs.status = 'active'
  from public.campaign_sellers cs
  where cs.campaign_id = p_campaign_id
    and cs.referral_code = nullif(btrim(p_referral_code), '')
  limit 1;
$$;

revoke all on function public.is_campaign_roster_manager(uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_campaign_sellers(uuid, uuid, text[]) from public, anon, authenticated;
revoke all on function public.update_campaign_seller(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.list_campaign_sellers(uuid, uuid) from public, anon, authenticated;
revoke all on function public.get_public_campaign_sellers(uuid) from public, anon, authenticated;
revoke all on function public.resolve_campaign_seller_referral(uuid, text) from public, anon, authenticated;

grant execute on function public.create_campaign_sellers(uuid, uuid, text[]) to authenticated, service_role;
grant execute on function public.update_campaign_seller(uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.list_campaign_sellers(uuid, uuid) to authenticated, service_role;
grant execute on function public.get_public_campaign_sellers(uuid) to anon, authenticated, service_role;
grant execute on function public.resolve_campaign_seller_referral(uuid, text) to anon, authenticated, service_role;

comment on table public.campaign_sellers is
  'Campaign-scoped sellers, students, or participants that do not require accounts.';
comment on column public.campaign_sellers.referral_code is
  'Stable public attribution code. Ineligible sellers fall back to campaign-only attribution.';

commit;
