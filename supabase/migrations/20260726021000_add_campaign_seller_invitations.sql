begin;

create extension if not exists pgcrypto;

create table if not exists public.campaign_seller_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  token_hash text not null unique,
  label text,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired', 'exhausted')),
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  revoked_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint campaign_seller_invitations_expiration_valid
    check (expires_at is null or expires_at > created_at)
);

create index if not exists campaign_seller_invitations_campaign_idx
  on public.campaign_seller_invitations(campaign_id, status, created_at desc);

create index if not exists campaign_seller_invitations_org_idx
  on public.campaign_seller_invitations(organization_id, status, created_at desc);

create table if not exists public.campaign_seller_invitation_acceptances (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.campaign_seller_invitations(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  seller_profile_id uuid not null references public.seller_profiles(id) on delete restrict,
  organization_membership_id uuid not null references public.organization_memberships(id) on delete restrict,
  campaign_membership_id uuid not null references public.campaign_memberships(id) on delete restrict,
  accepted_at timestamptz not null default now(),
  unique (invitation_id, user_id)
);

create index if not exists campaign_seller_invitation_acceptances_invite_idx
  on public.campaign_seller_invitation_acceptances(invitation_id, accepted_at desc);

alter table public.campaign_seller_invitations enable row level security;
alter table public.campaign_seller_invitation_acceptances enable row level security;

revoke all on table public.campaign_seller_invitations from public, anon, authenticated;
revoke all on table public.campaign_seller_invitation_acceptances from public, anon, authenticated;
grant select, insert, update on table public.campaign_seller_invitations to service_role;
grant select, insert on table public.campaign_seller_invitation_acceptances to service_role;

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
  select c.organization_id
  into v_organization_id
  from public.campaigns c
  where c.id = p_campaign_id;

  if v_organization_id is null then
    raise exception 'Campaign not found.';
  end if;

  if not exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = v_organization_id
      and om.user_id = p_actor_profile_id
      and om.status = 'active'
      and om.membership_role in ('admin', 'manager')
  ) and not public.is_owner() then
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

create or replace function public.revoke_campaign_seller_invitation(
  p_invitation_id uuid,
  p_actor_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
begin
  select organization_id
  into v_organization_id
  from public.campaign_seller_invitations
  where id = p_invitation_id;

  if v_organization_id is null then
    raise exception 'Invitation not found.';
  end if;

  if not exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = v_organization_id
      and om.user_id = p_actor_profile_id
      and om.status = 'active'
      and om.membership_role in ('admin', 'manager')
  ) and not public.is_owner() then
    raise exception 'Organization administrator access is required.';
  end if;

  update public.campaign_seller_invitations
  set status = 'revoked',
      revoked_by = p_actor_profile_id,
      revoked_at = now(),
      updated_at = now()
  where id = p_invitation_id
    and status = 'active';
end;
$$;

create or replace function public.accept_campaign_seller_invitation(
  p_raw_token text,
  p_user_profile_id uuid,
  p_display_name text
)
returns table(
  campaign_id uuid,
  organization_id uuid,
  campaign_membership_id uuid,
  referral_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.campaign_seller_invitations%rowtype;
  v_seller_profile_id uuid;
  v_org_membership_id uuid;
  v_campaign_membership_id uuid;
  v_referral_code text;
  v_existing_acceptance public.campaign_seller_invitation_acceptances%rowtype;
begin
  if nullif(btrim(p_raw_token), '') is null then
    raise exception 'Invitation token is required.';
  end if;

  if nullif(btrim(p_display_name), '') is null then
    raise exception 'Seller display name is required.';
  end if;

  select *
  into v_invitation
  from public.campaign_seller_invitations
  where token_hash = encode(digest(p_raw_token, 'sha256'), 'hex')
  for update;

  if v_invitation.id is null then
    raise exception 'Invitation is invalid.';
  end if;

  select *
  into v_existing_acceptance
  from public.campaign_seller_invitation_acceptances
  where invitation_id = v_invitation.id
    and user_id = p_user_profile_id;

  if v_existing_acceptance.id is not null then
    select cm.referral_code
    into v_referral_code
    from public.campaign_memberships cm
    where cm.id = v_existing_acceptance.campaign_membership_id;

    campaign_id := v_invitation.campaign_id;
    organization_id := v_invitation.organization_id;
    campaign_membership_id := v_existing_acceptance.campaign_membership_id;
    referral_code := v_referral_code;
    return next;
    return;
  end if;

  if v_invitation.status <> 'active' then
    raise exception 'Invitation is no longer active.';
  end if;

  if v_invitation.expires_at is not null and v_invitation.expires_at <= now() then
    update public.campaign_seller_invitations
    set status = 'expired', updated_at = now()
    where id = v_invitation.id;
    raise exception 'Invitation has expired.';
  end if;

  if v_invitation.max_uses is not null and v_invitation.use_count >= v_invitation.max_uses then
    update public.campaign_seller_invitations
    set status = 'exhausted', updated_at = now()
    where id = v_invitation.id;
    raise exception 'Invitation has reached its join limit.';
  end if;

  insert into public.seller_profiles (user_id, display_name)
  values (p_user_profile_id, btrim(p_display_name))
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        updated_at = now()
  returning id into v_seller_profile_id;

  select om.id
  into v_org_membership_id
  from public.organization_memberships om
  where om.organization_id = v_invitation.organization_id
    and om.user_id = p_user_profile_id
    and om.status in ('active', 'invited')
  order by case when om.status = 'active' then 0 else 1 end
  limit 1;

  if v_org_membership_id is null then
    insert into public.organization_memberships (
      organization_id,
      user_id,
      membership_role,
      status,
      display_name,
      invited_by,
      invited_at,
      accepted_at,
      seller_profile_id
    ) values (
      v_invitation.organization_id,
      p_user_profile_id,
      'seller',
      'active',
      btrim(p_display_name),
      v_invitation.created_by,
      v_invitation.created_at,
      now(),
      v_seller_profile_id
    ) returning id into v_org_membership_id;
  else
    update public.organization_memberships
    set membership_role = 'seller',
        status = 'active',
        display_name = btrim(p_display_name),
        accepted_at = coalesce(accepted_at, now()),
        seller_profile_id = v_seller_profile_id,
        updated_at = now()
    where id = v_org_membership_id;
  end if;

  select cm.id, cm.referral_code
  into v_campaign_membership_id, v_referral_code
  from public.campaign_memberships cm
  where cm.campaign_id = v_invitation.campaign_id
    and cm.organization_membership_id = v_org_membership_id
    and cm.status in ('active', 'invited')
  order by case when cm.status = 'active' then 0 else 1 end
  limit 1;

  if v_campaign_membership_id is null then
    loop
      v_referral_code := lower(substr(encode(gen_random_bytes(8), 'hex'), 1, 12));
      exit when not exists (
        select 1 from public.campaign_memberships where referral_code = v_referral_code
      );
    end loop;

    insert into public.campaign_memberships (
      campaign_id,
      organization_membership_id,
      referral_code,
      status,
      seller_profile_id,
      assigned_by,
      accepted_at,
      joined_at
    ) values (
      v_invitation.campaign_id,
      v_org_membership_id,
      v_referral_code,
      'active',
      v_seller_profile_id,
      v_invitation.created_by,
      now(),
      now()
    ) returning id into v_campaign_membership_id;
  else
    if v_referral_code is null then
      loop
        v_referral_code := lower(substr(encode(gen_random_bytes(8), 'hex'), 1, 12));
        exit when not exists (
          select 1 from public.campaign_memberships where referral_code = v_referral_code
        );
      end loop;
    end if;

    update public.campaign_memberships
    set status = 'active',
        referral_code = coalesce(referral_code, v_referral_code),
        seller_profile_id = v_seller_profile_id,
        assigned_by = coalesce(assigned_by, v_invitation.created_by),
        accepted_at = coalesce(accepted_at, now()),
        disabled_at = null,
        updated_at = now()
    where id = v_campaign_membership_id;
  end if;

  insert into public.campaign_seller_invitation_acceptances (
    invitation_id,
    user_id,
    seller_profile_id,
    organization_membership_id,
    campaign_membership_id
  ) values (
    v_invitation.id,
    p_user_profile_id,
    v_seller_profile_id,
    v_org_membership_id,
    v_campaign_membership_id
  );

  update public.campaign_seller_invitations
  set use_count = use_count + 1,
      status = case
        when max_uses is not null and use_count + 1 >= max_uses then 'exhausted'
        else status
      end,
      updated_at = now()
  where id = v_invitation.id;

  campaign_id := v_invitation.campaign_id;
  organization_id := v_invitation.organization_id;
  campaign_membership_id := v_campaign_membership_id;
  referral_code := v_referral_code;
  return next;
end;
$$;

revoke all on function public.create_campaign_seller_invitation(uuid, uuid, text, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.revoke_campaign_seller_invitation(uuid, uuid) from public, anon, authenticated;
revoke all on function public.accept_campaign_seller_invitation(text, uuid, text) from public, anon, authenticated;
grant execute on function public.create_campaign_seller_invitation(uuid, uuid, text, timestamptz, integer) to service_role;
grant execute on function public.revoke_campaign_seller_invitation(uuid, uuid) to service_role;
grant execute on function public.accept_campaign_seller_invitation(text, uuid, text) to service_role;

comment on table public.campaign_seller_invitations is
  'Campaign-specific seller invitation links. Raw tokens are returned once and only SHA-256 hashes are stored.';

comment on table public.campaign_seller_invitation_acceptances is
  'Immutable record connecting an accepted invitation to the resulting seller and campaign memberships.';

commit;