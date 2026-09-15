create table if not exists public.business_verifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  status text not null default 'not_applied' check (status in ('not_applied','needs_profile','pending','approved','declined','revoked')),
  application_cycle integer not null default 0 check (application_cycle >= 0),
  applied_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  declined_at timestamptz,
  revoked_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_verifications_status_idx
  on public.business_verifications(status, applied_at desc);

alter table public.business_verifications enable row level security;

revoke all on public.business_verifications from anon;
revoke insert, update, delete on public.business_verifications from authenticated;
grant select on public.business_verifications to authenticated;

create policy "business members read verification"
  on public.business_verifications
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = business_verifications.business_id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
    )
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'owner'
    )
  );

create or replace function public.apply_business_verification(p_business_id uuid)
returns public.business_verifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_business public.businesses%rowtype;
  v_profile public.profiles%rowtype;
  v_verification public.business_verifications%rowtype;
  v_profile_complete boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1 from public.business_memberships bm
    where bm.business_id = p_business_id
      and bm.user_id = v_user_id
      and bm.status = 'active'
      and bm.membership_role in ('owner','manager')
  ) then
    raise exception 'You do not have permission to apply for this business.';
  end if;

  select * into v_business from public.businesses where id = p_business_id;
  if not found or v_business.status <> 'active' then
    raise exception 'Business is not available for verification.';
  end if;

  if v_business.legacy_profile_id is not null then
    select * into v_profile from public.profiles where id = v_business.legacy_profile_id;
  end if;

  v_profile_complete :=
    coalesce(nullif(trim(v_business.name), ''), nullif(trim(v_profile.business_name), '')) is not null
    and coalesce(nullif(trim(v_business.phone), ''), nullif(trim(v_profile.phone), '')) is not null
    and coalesce(nullif(trim(v_business.address), ''), nullif(trim(v_profile.address), '')) is not null
    and coalesce(nullif(trim(v_business.logo_url), ''), nullif(trim(v_profile.logo_url), '')) is not null;

  insert into public.business_verifications (business_id, status)
  values (p_business_id, 'not_applied')
  on conflict (business_id) do nothing;

  select * into v_verification
  from public.business_verifications
  where business_id = p_business_id
  for update;

  if v_verification.status = 'approved' then
    return v_verification;
  end if;

  if not v_profile_complete then
    update public.business_verifications
    set status = 'needs_profile', updated_at = now()
    where business_id = p_business_id
    returning * into v_verification;
    return v_verification;
  end if;

  if v_verification.status <> 'pending' then
    update public.business_verifications
    set status = 'pending',
        application_cycle = application_cycle + 1,
        applied_at = now(),
        reviewed_at = null,
        reviewed_by = null,
        approved_at = null,
        declined_at = null,
        revoked_at = null,
        review_note = null,
        updated_at = now()
    where business_id = p_business_id
    returning * into v_verification;
  end if;

  return v_verification;
end;
$$;

revoke all on function public.apply_business_verification(uuid) from public, anon;
grant execute on function public.apply_business_verification(uuid) to authenticated;

create or replace function public.review_business_verification(
  p_business_id uuid,
  p_decision text,
  p_note text default null
)
returns public.business_verifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_verification public.business_verifications%rowtype;
  v_period_id uuid;
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles p where p.id = v_user_id and p.role = 'owner'
  ) then
    raise exception 'Owner access required.';
  end if;

  if p_decision not in ('approved','declined','revoked') then
    raise exception 'Invalid verification decision.';
  end if;

  select * into v_verification
  from public.business_verifications
  where business_id = p_business_id
  for update;

  if not found then
    raise exception 'Verification application not found.';
  end if;

  if p_decision in ('approved','declined') and v_verification.status <> 'pending' then
    raise exception 'Only pending applications can be approved or declined.';
  end if;

  if p_decision = 'revoked' and v_verification.status <> 'approved' then
    raise exception 'Only approved businesses can be revoked.';
  end if;

  update public.business_verifications
  set status = p_decision,
      reviewed_at = now(),
      reviewed_by = v_user_id,
      approved_at = case when p_decision = 'approved' then now() else approved_at end,
      declined_at = case when p_decision = 'declined' then now() else null end,
      revoked_at = case when p_decision = 'revoked' then now() else null end,
      review_note = nullif(trim(coalesce(p_note,'')),''),
      updated_at = now()
  where business_id = p_business_id
  returning * into v_verification;

  if p_decision = 'approved' then
    select id into v_period_id
    from public.partner_reward_periods
    where status = 'open' and starts_at <= now() and ends_at > now()
    order by starts_at desc
    limit 1;

    if v_period_id is not null then
      update public.partner_point_events
      set eligibility_status = 'eligible'
      where business_id = p_business_id
        and reward_period_id = v_period_id
        and eligibility_status = 'pending';

      insert into public.partner_point_events (
        business_id,
        reward_period_id,
        event_type,
        points,
        eligibility_status,
        source_type,
        source_id,
        idempotency_key,
        rule_version,
        metadata
      ) values (
        p_business_id,
        v_period_id,
        'verification_approved',
        200,
        'eligible',
        'business_verification',
        v_verification.id,
        'partner:' || v_period_id::text || ':verification_approved:' || v_verification.id::text || ':cycle:' || v_verification.application_cycle::text,
        'partner_rewards_v1',
        jsonb_build_object('application_cycle', v_verification.application_cycle, 'reviewed_by', v_user_id)
      )
      on conflict (idempotency_key) do nothing;
    end if;
  end if;

  return v_verification;
end;
$$;

revoke all on function public.review_business_verification(uuid,text,text) from public, anon;
grant execute on function public.review_business_verification(uuid,text,text) to authenticated;
