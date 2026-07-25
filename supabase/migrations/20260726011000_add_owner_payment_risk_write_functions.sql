begin;

create or replace function public.owner_update_global_payment_risk_policy(
  p_actor_profile_id uuid,
  p_reason text,
  p_idempotency_key text,
  p_policy jsonb
)
returns public.platform_payment_risk_policy
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous public.platform_payment_risk_policy;
  v_updated public.platform_payment_risk_policy;
begin
  if length(btrim(coalesce(p_reason, ''))) < 8 then
    raise exception 'A reason of at least 8 characters is required';
  end if;

  if exists (select 1 from public.payment_risk_audit_events where idempotency_key = p_idempotency_key) then
    select * into v_updated from public.platform_payment_risk_policy where singleton = true;
    return v_updated;
  end if;

  select * into v_previous from public.platform_payment_risk_policy where singleton = true for update;

  update public.platform_payment_risk_policy
  set standard_hold_days = coalesce((p_policy->>'standard_hold_days')::integer, standard_hold_days),
      first_payout_hold_days = coalesce((p_policy->>'first_payout_hold_days')::integer, first_payout_hold_days),
      reserve_percent_bps = coalesce((p_policy->>'reserve_percent_bps')::integer, reserve_percent_bps),
      reserve_days = coalesce((p_policy->>'reserve_days')::integer, reserve_days),
      minimum_loss_tolerance_cents = coalesce((p_policy->>'minimum_loss_tolerance_cents')::integer, minimum_loss_tolerance_cents),
      lifetime_payout_tolerance_bps = coalesce((p_policy->>'lifetime_payout_tolerance_bps')::integer, lifetime_payout_tolerance_bps),
      pattern_count_threshold = coalesce((p_policy->>'pattern_count_threshold')::integer, pattern_count_threshold),
      pattern_rate_threshold_bps = coalesce((p_policy->>'pattern_rate_threshold_bps')::integer, pattern_rate_threshold_bps),
      updated_at = now()
  where singleton = true
  returning * into v_updated;

  insert into public.payment_risk_audit_events (
    action_type, previous_value, new_value, reason, actor_profile_id, idempotency_key
  ) values (
    'global_policy_updated', to_jsonb(v_previous), to_jsonb(v_updated), btrim(p_reason), p_actor_profile_id, p_idempotency_key
  );

  return v_updated;
end;
$$;

create or replace function public.owner_upsert_organization_payment_risk_override(
  p_actor_profile_id uuid,
  p_organization_id uuid,
  p_reason text,
  p_idempotency_key text,
  p_override jsonb
)
returns public.organization_payment_risk_overrides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous public.organization_payment_risk_overrides;
  v_updated public.organization_payment_risk_overrides;
begin
  if length(btrim(coalesce(p_reason, ''))) < 8 then
    raise exception 'A reason of at least 8 characters is required';
  end if;

  if not exists (select 1 from public.organizations where id = p_organization_id) then
    raise exception 'Organization not found';
  end if;

  if exists (select 1 from public.payment_risk_audit_events where idempotency_key = p_idempotency_key) then
    select * into v_updated from public.organization_payment_risk_overrides where organization_id = p_organization_id;
    return v_updated;
  end if;

  select * into v_previous
  from public.organization_payment_risk_overrides
  where organization_id = p_organization_id
  for update;

  insert into public.organization_payment_risk_overrides (
    organization_id,
    standard_hold_days,
    first_payout_hold_days,
    reserve_percent_bps,
    reserve_days,
    minimum_loss_tolerance_cents,
    lifetime_payout_tolerance_bps,
    payouts_paused,
    manual_payout_approval_required,
    reason,
    updated_by
  ) values (
    p_organization_id,
    nullif(p_override->>'standard_hold_days', '')::integer,
    nullif(p_override->>'first_payout_hold_days', '')::integer,
    nullif(p_override->>'reserve_percent_bps', '')::integer,
    nullif(p_override->>'reserve_days', '')::integer,
    nullif(p_override->>'minimum_loss_tolerance_cents', '')::integer,
    nullif(p_override->>'lifetime_payout_tolerance_bps', '')::integer,
    coalesce((p_override->>'payouts_paused')::boolean, false),
    coalesce((p_override->>'manual_payout_approval_required')::boolean, false),
    btrim(p_reason),
    p_actor_profile_id
  )
  on conflict (organization_id) do update set
    standard_hold_days = excluded.standard_hold_days,
    first_payout_hold_days = excluded.first_payout_hold_days,
    reserve_percent_bps = excluded.reserve_percent_bps,
    reserve_days = excluded.reserve_days,
    minimum_loss_tolerance_cents = excluded.minimum_loss_tolerance_cents,
    lifetime_payout_tolerance_bps = excluded.lifetime_payout_tolerance_bps,
    payouts_paused = excluded.payouts_paused,
    manual_payout_approval_required = excluded.manual_payout_approval_required,
    reason = excluded.reason,
    updated_by = excluded.updated_by,
    updated_at = now()
  returning * into v_updated;

  insert into public.payment_risk_audit_events (
    organization_id, action_type, previous_value, new_value, reason,
    actor_profile_id, idempotency_key
  ) values (
    p_organization_id,
    case when v_previous.organization_id is null then 'organization_override_created' else 'organization_override_updated' end,
    case when v_previous.organization_id is null then null else to_jsonb(v_previous) end,
    to_jsonb(v_updated),
    btrim(p_reason),
    p_actor_profile_id,
    p_idempotency_key
  );

  return v_updated;
end;
$$;

create or replace function public.owner_reset_organization_payment_risk_override(
  p_actor_profile_id uuid,
  p_organization_id uuid,
  p_reason text,
  p_idempotency_key text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous public.organization_payment_risk_overrides;
begin
  if length(btrim(coalesce(p_reason, ''))) < 8 then
    raise exception 'A reason of at least 8 characters is required';
  end if;

  if exists (select 1 from public.payment_risk_audit_events where idempotency_key = p_idempotency_key) then
    return true;
  end if;

  delete from public.organization_payment_risk_overrides
  where organization_id = p_organization_id
  returning * into v_previous;

  if v_previous.organization_id is null then
    raise exception 'No organization override exists';
  end if;

  insert into public.payment_risk_audit_events (
    organization_id, action_type, previous_value, new_value, reason,
    actor_profile_id, idempotency_key
  ) values (
    p_organization_id,
    'organization_override_reset',
    to_jsonb(v_previous),
    null,
    btrim(p_reason),
    p_actor_profile_id,
    p_idempotency_key
  );

  return true;
end;
$$;

revoke all on function public.owner_update_global_payment_risk_policy(uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.owner_upsert_organization_payment_risk_override(uuid, uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.owner_reset_organization_payment_risk_override(uuid, uuid, text, text) from public, anon, authenticated;

grant execute on function public.owner_update_global_payment_risk_policy(uuid, text, text, jsonb) to service_role;
grant execute on function public.owner_upsert_organization_payment_risk_override(uuid, uuid, text, text, jsonb) to service_role;
grant execute on function public.owner_reset_organization_payment_risk_override(uuid, uuid, text, text) to service_role;

commit;