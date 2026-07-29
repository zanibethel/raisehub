begin;

create or replace function public.provision_organization_workspace_for_profile(
  p_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_organization_id uuid;
  v_fallback_name text;
begin
  select * into v_profile
  from public.profiles
  where id = p_profile_id;

  if v_profile.id is null or v_profile.role <> 'organization' then
    return null;
  end if;

  v_fallback_name := coalesce(
    nullif(btrim(v_profile.business_name), ''),
    nullif(btrim(v_profile.full_name), ''),
    nullif(btrim(v_profile.display_name), ''),
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
    'New Organization'
  );

  insert into public.organizations (
    legacy_profile_id,
    name,
    email,
    status,
    created_by,
    is_demo,
    demo_group
  ) values (
    v_profile.id,
    v_fallback_name,
    v_profile.email,
    'active',
    v_profile.id,
    coalesce(v_profile.is_demo, false),
    v_profile.demo_group
  )
  on conflict (legacy_profile_id) do update
  set email = coalesce(excluded.email, public.organizations.email),
      is_demo = excluded.is_demo,
      demo_group = excluded.demo_group,
      updated_at = now()
  returning id into v_organization_id;

  insert into public.organization_memberships (
    organization_id,
    user_id,
    membership_role,
    status,
    display_name,
    accepted_at,
    is_demo,
    demo_group
  ) values (
    v_organization_id,
    v_profile.id,
    'admin',
    'active',
    v_fallback_name,
    now(),
    coalesce(v_profile.is_demo, false),
    v_profile.demo_group
  )
  on conflict (organization_id, user_id) do update
  set membership_role = case
        when public.organization_memberships.membership_role in ('admin', 'manager')
          then public.organization_memberships.membership_role
        else 'admin'
      end,
      status = 'active',
      accepted_at = coalesce(public.organization_memberships.accepted_at, now()),
      removed_at = null,
      suspended_at = null,
      is_demo = excluded.is_demo,
      demo_group = excluded.demo_group,
      updated_at = now();

  return v_organization_id;
end;
$$;

revoke all on function public.provision_organization_workspace_for_profile(uuid)
  from public, anon, authenticated;
grant execute on function public.provision_organization_workspace_for_profile(uuid)
  to service_role;

create or replace function public.provision_organization_workspace_profile_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'organization' then
    perform public.provision_organization_workspace_for_profile(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists provision_organization_workspace_after_profile_write
  on public.profiles;
create trigger provision_organization_workspace_after_profile_write
after insert or update of role, email, business_name, full_name, display_name, is_demo, demo_group
on public.profiles
for each row
when (new.role = 'organization')
execute function public.provision_organization_workspace_profile_trigger();

do $$
declare
  v_profile_id uuid;
begin
  for v_profile_id in
    select id from public.profiles where role = 'organization'
  loop
    perform public.provision_organization_workspace_for_profile(v_profile_id);
  end loop;
end;
$$;

comment on function public.provision_organization_workspace_for_profile(uuid) is
  'Idempotently creates or repairs the canonical organization and active admin membership for an organization profile.';

commit;
