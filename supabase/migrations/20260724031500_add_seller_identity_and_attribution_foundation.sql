begin;

-- =============================================================================
-- Seller identity
-- =============================================================================

create table if not exists public.seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique
    references public.profiles(id) on delete cascade,
  display_name text not null,
  bio text,
  avatar_url text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists seller_profiles_status_idx
  on public.seller_profiles(status);

-- Existing seller memberships receive one reusable person-level seller profile.
insert into public.seller_profiles (user_id, display_name)
select distinct on (om.user_id)
  om.user_id,
  coalesce(nullif(btrim(om.display_name), ''), 'Seller')
from public.organization_memberships om
where om.membership_role = 'seller'
  and om.status in ('invited', 'active')
on conflict (user_id) do nothing;

-- =============================================================================
-- Organization and campaign linkage
-- =============================================================================

alter table public.organization_memberships
  add column if not exists seller_profile_id uuid
    references public.seller_profiles(id) on delete set null;

alter table public.campaign_memberships
  add column if not exists seller_profile_id uuid
    references public.seller_profiles(id) on delete set null,
  add column if not exists assigned_by uuid
    references public.profiles(id) on delete set null,
  add column if not exists accepted_at timestamptz;

update public.organization_memberships om
set seller_profile_id = sp.id
from public.seller_profiles sp
where om.user_id = sp.user_id
  and om.membership_role = 'seller'
  and om.seller_profile_id is null;

update public.campaign_memberships cm
set seller_profile_id = om.seller_profile_id
from public.organization_memberships om
where cm.organization_membership_id = om.id
  and cm.seller_profile_id is null
  and om.seller_profile_id is not null;

create index if not exists organization_memberships_seller_profile_idx
  on public.organization_memberships(seller_profile_id)
  where seller_profile_id is not null;

create index if not exists campaign_memberships_seller_profile_idx
  on public.campaign_memberships(seller_profile_id)
  where seller_profile_id is not null;

-- =============================================================================
-- Immutable checkout and purchase attribution snapshots
-- =============================================================================

alter table public.checkout_attempts
  add column if not exists campaign_membership_id uuid
    references public.campaign_memberships(id) on delete set null,
  add column if not exists seller_profile_id uuid
    references public.seller_profiles(id) on delete set null,
  add column if not exists seller_referral_code_snapshot text;

alter table public.campaign_purchases
  add column if not exists campaign_membership_id uuid
    references public.campaign_memberships(id) on delete set null,
  add column if not exists seller_profile_id uuid
    references public.seller_profiles(id) on delete set null,
  add column if not exists seller_referral_code_snapshot text;

create index if not exists checkout_attempts_campaign_membership_idx
  on public.checkout_attempts(campaign_membership_id)
  where campaign_membership_id is not null;

create index if not exists checkout_attempts_seller_profile_idx
  on public.checkout_attempts(seller_profile_id)
  where seller_profile_id is not null;

create index if not exists campaign_purchases_campaign_membership_idx
  on public.campaign_purchases(campaign_membership_id)
  where campaign_membership_id is not null;

create index if not exists campaign_purchases_seller_profile_idx
  on public.campaign_purchases(seller_profile_id)
  where seller_profile_id is not null;

-- =============================================================================
-- Access controls
-- =============================================================================

alter table public.seller_profiles enable row level security;

create policy seller_profiles_select_self_owner_or_org_manager
  on public.seller_profiles
  for select
  to authenticated
  using (
    public.is_owner()
    or user_id = (select auth.uid())
    or exists (
      select 1
      from public.organization_memberships seller_membership
      join public.organization_memberships manager_membership
        on manager_membership.organization_id = seller_membership.organization_id
      where seller_membership.seller_profile_id = seller_profiles.id
        and seller_membership.status in ('invited', 'active')
        and manager_membership.user_id = (select auth.uid())
        and manager_membership.status = 'active'
        and manager_membership.membership_role in ('admin', 'manager')
    )
  );

revoke all on table public.seller_profiles from public, anon, authenticated;
grant select on table public.seller_profiles to authenticated;
grant select, insert, update on table public.seller_profiles to service_role;

comment on table public.seller_profiles is
  'Reusable person-level seller identities that may participate in multiple organizations and campaigns.';

comment on column public.campaign_memberships.seller_profile_id is
  'Seller identity assigned to this campaign membership.';

comment on column public.campaign_purchases.campaign_membership_id is
  'Immutable seller campaign assignment attributed when checkout was created.';

comment on column public.campaign_purchases.seller_referral_code_snapshot is
  'Referral code captured at checkout so historical attribution survives later code changes.';

commit;
