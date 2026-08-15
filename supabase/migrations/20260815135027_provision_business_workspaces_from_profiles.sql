begin;

create or replace function public.provision_business_workspace_for_profile(
  p_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_business_id uuid;
  v_fallback_name text;
begin
  select * into v_profile
  from public.profiles
  where id = p_profile_id;

  if v_profile.id is null or v_profile.role <> 'business' then
    return null;
  end if;

  v_fallback_name := coalesce(
    nullif(btrim(v_profile.business_name), ''),
    nullif(btrim(v_profile.display_name), ''),
    nullif(btrim(v_profile.full_name), ''),
    nullif(
      initcap(
        regexp_replace(
          split_part(coalesce(v_profile.email, ''), '@', 1),
          '[-_.]+',
          ' ',
          'g'
        )
      ),
      ''
    ),
    'New Business'
  );

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
    updated_at,
    is_demo,
    demo_group,
    address,
    google_maps_url
  ) values (
    v_profile.id,
    v_fallback_name,
    nullif(btrim(v_profile.business_description), ''),
    nullif(btrim(v_profile.business_category), ''),
    nullif(btrim(v_profile.logo_url), ''),
    nullif(btrim(v_profile.phone), ''),
    nullif(btrim(v_profile.email), ''),
    nullif(btrim(v_profile.website_url), ''),
    'active',
    coalesce(nullif(btrim(v_profile.subscription_tier), ''), 'free'),
    v_profile.id,
    v_profile.created_at,
    now(),
    coalesce(v_profile.is_demo, false),
    v_profile.demo_group,
    nullif(btrim(v_profile.address), ''),
    nullif(btrim(v_profile.google_maps_url), '')
  )
  on conflict (legacy_profile_id) do update
  set name = excluded.name,
      description = excluded.description,
      category = excluded.category,
      logo_url = excluded.logo_url,
      phone = excluded.phone,
      email = coalesce(excluded.email, public.businesses.email),
      website_url = excluded.website_url,
      subscription_tier = excluded.subscription_tier,
      is_demo = excluded.is_demo,
      demo_group = excluded.demo_group,
      address = excluded.address,
      google_maps_url = excluded.google_maps_url,
      updated_at = now()
  returning id into v_business_id;

  insert into public.business_memberships (
    business_id,
    user_id,
    membership_role,
    status,
    accepted_at,
    is_demo,
    demo_group
  ) values (
    v_business_id,
    v_profile.id,
    'owner',
    'active',
    now(),
    coalesce(v_profile.is_demo, false),
    v_profile.demo_group
  )
  on conflict (business_id, user_id) do update
  set membership_role = case
        when public.business_memberships.membership_role in ('owner', 'manager')
          then public.business_memberships.membership_role
        else 'owner'
      end,
      status = 'active',
      accepted_at = coalesce(public.business_memberships.accepted_at, now()),
      removed_at = null,
      suspended_at = null,
      is_demo = excluded.is_demo,
      demo_group = excluded.demo_group,
      updated_at = now();

  return v_business_id;
end;
$$;

create or replace function public.provision_business_workspace_profile_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'business' then
    perform public.provision_business_workspace_for_profile(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists provision_business_workspace_after_profile_write on public.profiles;

create trigger provision_business_workspace_after_profile_write
after insert or update of
  role,
  email,
  business_name,
  full_name,
  display_name,
  business_description,
  business_category,
  logo_url,
  phone,
  website_url,
  subscription_tier,
  is_demo,
  demo_group,
  address,
  google_maps_url
on public.profiles
for each row
when (new.role = 'business')
execute function public.provision_business_workspace_profile_trigger();

revoke all on function public.provision_business_workspace_for_profile(uuid) from public, anon, authenticated;
revoke all on function public.provision_business_workspace_profile_trigger() from public, anon, authenticated;

select public.provision_business_workspace_for_profile(p.id)
from public.profiles p
where p.role = 'business';

commit;
