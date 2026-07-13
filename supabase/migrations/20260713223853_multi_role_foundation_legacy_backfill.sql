begin;

create index business_memberships_invited_by_idx
  on public.business_memberships(invited_by);

create index organization_memberships_invited_by_idx
  on public.organization_memberships(invited_by);

create index customer_entitlements_replacement_id_idx
  on public.customer_entitlements(replacement_entitlement_id);

insert into public.businesses (
  legacy_profile_id,
  name,
  description,
  category,
  logo_url,
  phone,
  email,
  website_url,
  status,
  subscription_tier,
  created_by,
  created_at,
  updated_at
)
select
  p.id,
  coalesce(
    nullif(trim(p.business_name), ''),
    nullif(trim(p.display_name), ''),
    nullif(trim(p.full_name), ''),
    nullif(trim(p.email), '')
  ),
  nullif(trim(p.business_description), ''),
  nullif(trim(p.business_category), ''),
  nullif(trim(p.logo_url), ''),
  nullif(trim(p.phone), ''),
  nullif(trim(p.email), ''),
  nullif(trim(p.website_url), ''),
  'active',
  p.subscription_tier,
  p.id,
  p.created_at,
  now()
from public.profiles p
where p.role = 'business'
on conflict (legacy_profile_id) do nothing;

insert into public.business_memberships (
  business_id,
  user_id,
  membership_role,
  status,
  accepted_at,
  created_at,
  updated_at
)
select
  b.id,
  b.legacy_profile_id,
  'owner',
  'active',
  b.created_at,
  b.created_at,
  now()
from public.businesses b
join public.profiles p
  on p.id = b.legacy_profile_id
where p.role = 'business'
  and not exists (
    select 1
    from public.business_memberships bm
    where bm.business_id = b.id
      and bm.user_id = b.legacy_profile_id
      and bm.status = 'active'
  );

insert into public.organizations (
  legacy_profile_id,
  name,
  description,
  logo_url,
  phone,
  email,
  website_url,
  status,
  created_by,
  created_at,
  updated_at
)
select
  p.id,
  coalesce(
    nullif(trim(p.business_name), ''),
    nullif(trim(p.display_name), ''),
    nullif(trim(p.full_name), ''),
    nullif(trim(p.email), '')
  ),
  nullif(trim(p.business_description), ''),
  nullif(trim(p.logo_url), ''),
  nullif(trim(p.phone), ''),
  nullif(trim(p.email), ''),
  nullif(trim(p.website_url), ''),
  'active',
  p.id,
  p.created_at,
  now()
from public.profiles p
where p.role = 'organization'
on conflict (legacy_profile_id) do nothing;

insert into public.organization_memberships (
  organization_id,
  user_id,
  membership_role,
  status,
  display_name,
  accepted_at,
  created_at,
  updated_at
)
select
  o.id,
  o.legacy_profile_id,
  'admin',
  'active',
  p.display_name,
  o.created_at,
  o.created_at,
  now()
from public.organizations o
join public.profiles p
  on p.id = o.legacy_profile_id
where p.role = 'organization'
  and not exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = o.id
      and om.user_id = o.legacy_profile_id
      and om.status = 'active'
  );

commit;