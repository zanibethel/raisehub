-- =============================================================================
-- Record organization earnings with configurable payout holds and reserves
-- =============================================================================

create or replace function public.record_paid_purchase_earnings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_policy public.platform_payment_risk_policy%rowtype;
  v_organization_id uuid;
  v_earning_cents integer;
  v_reserve_cents integer;
  v_hold_days integer;
  v_has_completed_transfer boolean;
begin
  if new.payment_status <> 'paid' or old.payment_status = 'paid' then
    return new;
  end if;

  v_organization_id := new.organization_workspace_id;

  if v_organization_id is null then
    select o.id
    into v_organization_id
    from public.organizations o
    where o.legacy_profile_id = new.selected_organization_id
    limit 1;
  end if;

  if v_organization_id is null then
    raise exception 'paid purchase is missing a canonical organization';
  end if;

  select * into v_policy
  from public.platform_payment_risk_policy
  where singleton = true;

  v_earning_cents := round(new.organization_earnings * 100)::integer;

  if v_earning_cents <= 0 then
    return new;
  end if;

  select exists (
    select 1
    from public.organization_transfers
    where organization_id = v_organization_id
      and status = 'completed'
  ) into v_has_completed_transfer;

  v_hold_days := case
    when v_has_completed_transfer then v_policy.standard_hold_days
    else v_policy.first_payout_hold_days
  end;

  v_reserve_cents := floor(
    v_earning_cents * v_policy.reserve_percent_bps / 10000.0
  )::integer;

  insert into public.organization_earnings_ledger (
    organization_id,
    campaign_id,
    purchase_id,
    entry_type,
    amount_cents,
    currency,
    available_on,
    idempotency_key,
    description,
    metadata
  ) values (
    v_organization_id,
    new.campaign_id,
    new.id,
    'purchase_earning',
    v_earning_cents,
    'usd',
    now() + make_interval(days => v_hold_days),
    'purchase:' || new.id::text || ':earning',
    'Organization earnings held before payout eligibility',
    jsonb_build_object(
      'hold_days', v_hold_days,
      'first_payout', not v_has_completed_transfer
    )
  ) on conflict (idempotency_key) do nothing;

  if v_reserve_cents > 0 then
    insert into public.organization_earnings_ledger (
      organization_id,
      campaign_id,
      purchase_id,
      entry_type,
      amount_cents,
      currency,
      available_on,
      idempotency_key,
      description,
      metadata
    ) values (
      v_organization_id,
      new.campaign_id,
      new.id,
      'reserve_hold',
      -v_reserve_cents,
      'usd',
      now() + make_interval(days => v_hold_days),
      'purchase:' || new.id::text || ':reserve_hold',
      'Rolling reserve withheld from payout availability',
      jsonb_build_object(
        'reserve_percent_bps', v_policy.reserve_percent_bps,
        'reserve_days', v_policy.reserve_days
      )
    ) on conflict (idempotency_key) do nothing;

    insert into public.organization_earnings_ledger (
      organization_id,
      campaign_id,
      purchase_id,
      entry_type,
      amount_cents,
      currency,
      available_on,
      idempotency_key,
      description,
      metadata
    ) values (
      v_organization_id,
      new.campaign_id,
      new.id,
      'reserve_release',
      v_reserve_cents,
      'usd',
      now() + make_interval(days => v_policy.reserve_days),
      'purchase:' || new.id::text || ':reserve_release',
      'Rolling reserve released after the risk window',
      jsonb_build_object(
        'reserve_percent_bps', v_policy.reserve_percent_bps,
        'reserve_days', v_policy.reserve_days
      )
    ) on conflict (idempotency_key) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.record_paid_purchase_earnings()
  from public, anon, authenticated;
grant execute on function public.record_paid_purchase_earnings()
  to service_role;

drop trigger if exists record_paid_purchase_earnings_trigger
  on public.campaign_purchases;

create trigger record_paid_purchase_earnings_trigger
after update of payment_status on public.campaign_purchases
for each row
when (new.payment_status = 'paid' and old.payment_status is distinct from new.payment_status)
execute function public.record_paid_purchase_earnings();

comment on function public.record_paid_purchase_earnings() is
  'Records organization earnings with a 7-day standard hold, 14-day first-payout hold, 5% rolling reserve, and 60-day reserve release using the configurable platform risk policy.';
