-- Preserve RaiseHub's Live/Demo boundary when authenticated users create
-- business or organization workspaces. SECURITY DEFINER bypasses RLS, so the
-- actor's trusted profile environment must be copied into every new workspace.

create or replace function public.create_business_workspace(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid;
  v_actor_is_demo boolean;
  v_actor_demo_group text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select p.is_demo, p.demo_group
    into v_actor_is_demo, v_actor_demo_group
  from public.profiles p
  where p.id = v_user_id;

  if not found then
    raise exception 'RaiseHub profile required';
  end if;

  if v_actor_is_demo and nullif(btrim(v_actor_demo_group), '') is null then
    raise exception 'Demo account is missing a demo group';
  end if;

  if not v_actor_is_demo and v_actor_demo_group is not null then
    raise exception 'Live account cannot include a demo group';
  end if;

  if nullif(btrim(p_name), '') is null then
    raise exception 'Business name is required';
  end if;

  if exists (
    select 1
    from public.business_memberships bm
    where bm.user_id = v_user_id
      and bm.status = 'active'
  ) then
    raise exception 'A business workspace already exists for this account';
  end if;

  insert into public.businesses (
    name,
    email,
    created_by,
    legacy_profile_id,
    is_demo,
    demo_group
  )
  values (
    btrim(p_name),
    (select email from auth.users where id = v_user_id),
    v_user_id,
    v_user_id,
    v_actor_is_demo,
    v_actor_demo_group
  )
  returning id into v_business_id;

  insert into public.business_memberships (
    business_id,
    user_id,
    membership_role,
    status,
    accepted_at
  ) values (
    v_business_id,
    v_user_id,
    'owner',
    'active',
    now()
  );

  update public.profiles
  set business_name = btrim(p_name)
  where id = v_user_id;

  return v_business_id;
end;
$$;

create or replace function public.create_organization_workspace(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
  v_actor_is_demo boolean;
  v_actor_demo_group text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select p.is_demo, p.demo_group
    into v_actor_is_demo, v_actor_demo_group
  from public.profiles p
  where p.id = v_user_id;

  if not found then
    raise exception 'RaiseHub profile required';
  end if;

  if v_actor_is_demo and nullif(btrim(v_actor_demo_group), '') is null then
    raise exception 'Demo account is missing a demo group';
  end if;

  if not v_actor_is_demo and v_actor_demo_group is not null then
    raise exception 'Live account cannot include a demo group';
  end if;

  if nullif(btrim(p_name), '') is null then
    raise exception 'Organization name is required';
  end if;

  if exists (
    select 1
    from public.organization_memberships om
    where om.user_id = v_user_id
      and om.status = 'active'
  ) then
    raise exception 'An organization workspace already exists for this account';
  end if;

  insert into public.organizations (
    name,
    email,
    created_by,
    legacy_profile_id,
    is_demo,
    demo_group
  )
  values (
    btrim(p_name),
    (select email from auth.users where id = v_user_id),
    v_user_id,
    v_user_id,
    v_actor_is_demo,
    v_actor_demo_group
  )
  returning id into v_organization_id;

  insert into public.organization_memberships (
    organization_id,
    user_id,
    membership_role,
    status,
    accepted_at
  ) values (
    v_organization_id,
    v_user_id,
    'admin',
    'active',
    now()
  );

  return v_organization_id;
end;
$$;

-- Keep these RPCs intentionally limited to signed-in users and trusted
-- server-side service-role callers.
revoke execute on function public.create_business_workspace(text) from public, anon;
revoke execute on function public.create_organization_workspace(text) from public, anon;
grant execute on function public.create_business_workspace(text) to authenticated, service_role;
grant execute on function public.create_organization_workspace(text) to authenticated, service_role;
