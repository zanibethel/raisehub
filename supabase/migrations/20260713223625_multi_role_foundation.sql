begin;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  legacy_profile_id uuid unique references public.profiles(id) on delete set null,
  name text not null,
  legal_name text,
  description text,
  category text,
  logo_url text,
  phone text,
  email text,
  website_url text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'suspended', 'archived')),
  subscription_tier text not null default 'free',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.business_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  user_id uuid not null
    references public.profiles(id) on delete cascade,
  membership_role text not null
    check (membership_role in ('owner', 'manager', 'staff', 'viewer')),
  status text not null default 'active'
    check (status in ('invited', 'active', 'suspended', 'removed')),
  invited_by uuid references public.profiles(id) on delete set null,
  invited_at timestamptz,
  accepted_at timestamptz,
  suspended_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  legacy_profile_id uuid unique references public.profiles(id) on delete set null,
  name text not null,
  description text,
  organization_type text,
  logo_url text,
  phone text,
  email text,
  website_url text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'suspended', 'archived')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  user_id uuid not null
    references public.profiles(id) on delete cascade,
  membership_role text not null
    check (membership_role in ('admin', 'manager', 'seller', 'viewer')),
  status text not null default 'active'
    check (status in ('invited', 'active', 'suspended', 'removed')),
  display_name text,
  invited_by uuid references public.profiles(id) on delete set null,
  invited_at timestamptz,
  accepted_at timestamptz,
  suspended_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaign_memberships (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null
    references public.campaigns(id) on delete cascade,
  organization_membership_id uuid not null
    references public.organization_memberships(id) on delete cascade,
  referral_code text,
  personal_goal numeric not null default 0
    check (personal_goal >= 0),
  status text not null default 'active'
    check (status in ('invited', 'active', 'suspended', 'removed')),
  joined_at timestamptz not null default now(),
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references public.profiles(id) on delete cascade,
  purchase_id uuid
    references public.campaign_purchases(id) on delete set null,
  entitlement_type text not null
    check (
      entitlement_type in (
        'purchased_pass',
        'complimentary_pass',
        'trial',
        'promotional_access',
        'replacement_access'
      )
    ),
  status text not null
    check (
      status in (
        'pending',
        'active',
        'expired',
        'revoked',
        'replaced',
        'cancelled'
      )
    ),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  granted_by uuid
    references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  replacement_entitlement_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint customer_entitlements_valid_dates
    check (expires_at is null or expires_at > starts_at),

  constraint customer_entitlements_replacement_fk
    foreign key (replacement_entitlement_id)
    references public.customer_entitlements(id)
    on delete set null
);

create unique index business_memberships_one_active_per_user_business
  on public.business_memberships (business_id, user_id)
  where status = 'active';

create index business_memberships_user_id_idx
  on public.business_memberships(user_id);

create index business_memberships_business_id_idx
  on public.business_memberships(business_id);

create index businesses_created_by_idx
  on public.businesses(created_by);

create index businesses_status_idx
  on public.businesses(status);

create unique index organization_memberships_one_active_per_user_org
  on public.organization_memberships (organization_id, user_id)
  where status = 'active';

create index organization_memberships_user_id_idx
  on public.organization_memberships(user_id);

create index organization_memberships_organization_id_idx
  on public.organization_memberships(organization_id);

create index organizations_created_by_idx
  on public.organizations(created_by);

create index organizations_status_idx
  on public.organizations(status);

create unique index campaign_memberships_one_active_per_campaign_member
  on public.campaign_memberships (
    campaign_id,
    organization_membership_id
  )
  where status = 'active';

create unique index campaign_memberships_referral_code_unique
  on public.campaign_memberships(referral_code)
  where referral_code is not null;

create index campaign_memberships_campaign_id_idx
  on public.campaign_memberships(campaign_id);

create index campaign_memberships_org_membership_id_idx
  on public.campaign_memberships(organization_membership_id);

create index customer_entitlements_user_id_idx
  on public.customer_entitlements(user_id);

create index customer_entitlements_purchase_id_idx
  on public.customer_entitlements(purchase_id);

create index customer_entitlements_active_lookup_idx
  on public.customer_entitlements(
    user_id,
    status,
    starts_at,
    expires_at
  );

create index customer_entitlements_granted_by_idx
  on public.customer_entitlements(granted_by);

alter table public.businesses enable row level security;
alter table public.business_memberships enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.campaign_memberships enable row level security;
alter table public.customer_entitlements enable row level security;

create policy businesses_select_for_members_or_owner
  on public.businesses
  for select
  to authenticated
  using (
    public.is_owner()
    or exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = businesses.id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
    )
  );

create policy business_memberships_select_own_or_owner
  on public.business_memberships
  for select
  to authenticated
  using (
    public.is_owner()
    or user_id = (select auth.uid())
  );

create policy organizations_select_for_members_or_owner
  on public.organizations
  for select
  to authenticated
  using (
    public.is_owner()
    or exists (
      select 1
      from public.organization_memberships om
      where om.organization_id = organizations.id
        and om.user_id = (select auth.uid())
        and om.status = 'active'
    )
  );

create policy organization_memberships_select_own_or_owner
  on public.organization_memberships
  for select
  to authenticated
  using (
    public.is_owner()
    or user_id = (select auth.uid())
  );

create policy campaign_memberships_select_own_or_owner
  on public.campaign_memberships
  for select
  to authenticated
  using (
    public.is_owner()
    or exists (
      select 1
      from public.organization_memberships om
      where om.id = campaign_memberships.organization_membership_id
        and om.user_id = (select auth.uid())
        and om.status = 'active'
    )
  );

create policy customer_entitlements_select_own_or_owner
  on public.customer_entitlements
  for select
  to authenticated
  using (
    public.is_owner()
    or user_id = (select auth.uid())
  );

revoke all on table public.businesses
  from anon, authenticated;

revoke all on table public.business_memberships
  from anon, authenticated;

revoke all on table public.organizations
  from anon, authenticated;

revoke all on table public.organization_memberships
  from anon, authenticated;

revoke all on table public.campaign_memberships
  from anon, authenticated;

revoke all on table public.customer_entitlements
  from anon, authenticated;

grant select on table public.businesses
  to authenticated;

grant select on table public.business_memberships
  to authenticated;

grant select on table public.organizations
  to authenticated;

grant select on table public.organization_memberships
  to authenticated;

grant select on table public.campaign_memberships
  to authenticated;

grant select on table public.customer_entitlements
  to authenticated;

comment on table public.businesses is
  'Independent business entities. Legacy profile linkage is transitional.';

comment on table public.business_memberships is
  'User-to-business relationships and business-scoped roles.';

comment on table public.organizations is
  'Independent fundraising organization entities. Legacy profile linkage is transitional.';

comment on table public.organization_memberships is
  'User-to-organization relationships and organization-scoped roles.';

comment on table public.campaign_memberships is
  'Campaign participation tied to an organization membership.';

comment on table public.customer_entitlements is
  'Time- and status-limited customer benefit access independent of other memberships.';

commit;