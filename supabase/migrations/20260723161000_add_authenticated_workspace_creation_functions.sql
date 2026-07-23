create or replace function public.create_business_workspace(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
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

  insert into public.businesses (name, email, created_by)
  values (
    btrim(p_name),
    (select email from auth.users where id = v_user_id),
    v_user_id
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
begin
  if v_user_id is null then
    raise exception 'Authentication required';
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

  insert into public.organizations (name, email, created_by)
  values (
    btrim(p_name),
    (select email from auth.users where id = v_user_id),
    v_user_id
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

revoke all on function public.create_business_workspace(text) from public;
revoke all on function public.create_organization_workspace(text) from public;
grant execute on function public.create_business_workspace(text) to authenticated;
grant execute on function public.create_organization_workspace(text) to authenticated;
