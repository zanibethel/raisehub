begin;

create or replace function public.resolve_campaign_workspace_organization_id(
  p_campaign_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(c.canonical_organization_id, o.id)
  from public.campaigns c
  left join public.organizations o
    on o.legacy_profile_id = c.organization_id
  where c.id = p_campaign_id
  limit 1;
$$;

revoke all on function public.resolve_campaign_workspace_organization_id(uuid)
  from public, anon, authenticated;
grant execute on function public.resolve_campaign_workspace_organization_id(uuid)
  to service_role;

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
      from public.organization_memberships om
      where om.organization_id = public.resolve_campaign_workspace_organization_id(p_campaign_id)
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
  v_org_id := public.resolve_campaign_workspace_organization_id(p_campaign_id);

  if v_org_id is null then raise exception 'Campaign organization workspace not found.'; end if;
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

create or replace function public.create_campaign_seller_invitation(
  p_campaign_id uuid,
  p_actor_profile_id uuid,
  p_label text default null,
  p_expires_at timestamptz default null,
  p_max_uses integer default null
)
returns table(invitation_id uuid, raw_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_token text;
begin
  v_organization_id := public.resolve_campaign_workspace_organization_id(p_campaign_id);

  if v_organization_id is null then
    raise exception 'Campaign organization workspace not found.';
  end if;

  if not public.is_campaign_roster_manager(p_campaign_id, p_actor_profile_id) then
    raise exception 'Organization administrator access is required.';
  end if;

  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'Expiration must be in the future.';
  end if;

  if p_max_uses is not null and p_max_uses < 1 then
    raise exception 'Maximum uses must be at least 1.';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');

  insert into public.campaign_seller_invitations (
    organization_id,
    campaign_id,
    token_hash,
    label,
    expires_at,
    max_uses,
    created_by
  ) values (
    v_organization_id,
    p_campaign_id,
    encode(digest(v_token, 'sha256'), 'hex'),
    nullif(btrim(p_label), ''),
    p_expires_at,
    p_max_uses,
    p_actor_profile_id
  )
  returning id into invitation_id;

  raw_token := v_token;
  return next;
end;
$$;

revoke all on function public.is_campaign_roster_manager(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.create_campaign_sellers(uuid, uuid, text[])
  from public, anon, authenticated;
revoke all on function public.create_campaign_seller_invitation(uuid, uuid, text, timestamptz, integer)
  from public, anon, authenticated;

grant execute on function public.is_campaign_roster_manager(uuid, uuid)
  to service_role;
grant execute on function public.create_campaign_sellers(uuid, uuid, text[])
  to service_role;
grant execute on function public.create_campaign_seller_invitation(uuid, uuid, text, timestamptz, integer)
  to service_role;

commit;
