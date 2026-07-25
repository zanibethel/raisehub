-- =============================================================================
-- Refund, dispute, entitlement, and post-payout loss reconciliation
-- =============================================================================

alter table public.campaign_purchases
  add column if not exists stripe_charge_id text,
  add column if not exists stripe_latest_refund_id text,
  add column if not exists stripe_dispute_id text,
  add column if not exists refunded_amount_cents integer not null default 0,
  add column if not exists disputed_at timestamptz,
  add column if not exists dispute_status text;

create unique index if not exists campaign_purchases_stripe_charge_unique_idx
  on public.campaign_purchases (stripe_charge_id)
  where stripe_charge_id is not null;

create index if not exists campaign_purchases_stripe_dispute_idx
  on public.campaign_purchases (stripe_dispute_id)
  where stripe_dispute_id is not null;

alter table public.customer_entitlements
  drop constraint if exists customer_entitlements_status_check;

alter table public.customer_entitlements
  add constraint customer_entitlements_status_check
  check (status in (
    'pending', 'active', 'suspended', 'expired', 'revoked',
    'replaced', 'cancelled'
  ));

alter table public.organization_earnings_ledger
  drop constraint if exists organization_earnings_ledger_entry_type_valid;

alter table public.organization_earnings_ledger
  add constraint organization_earnings_ledger_entry_type_valid
  check (entry_type in (
    'purchase_earning', 'platform_fee', 'processing_fee', 'refund',
    'dispute', 'dispute_reversal', 'transfer', 'transfer_reversal',
    'reserve_hold', 'reserve_release', 'platform_loss', 'manual_adjustment'
  ));

create table if not exists public.platform_payment_risk_policy (
  singleton boolean primary key default true check (singleton),
  standard_hold_days integer not null default 7 check (standard_hold_days between 0 and 90),
  first_payout_hold_days integer not null default 14 check (first_payout_hold_days between 0 and 90),
  reserve_percent_bps integer not null default 500 check (reserve_percent_bps between 0 and 10000),
  reserve_days integer not null default 60 check (reserve_days between 0 and 365),
  minimum_loss_tolerance_cents integer not null default 5000 check (minimum_loss_tolerance_cents >= 0),
  lifetime_payout_tolerance_bps integer not null default 100 check (lifetime_payout_tolerance_bps between 0 and 10000),
  pattern_count_threshold integer not null default 3 check (pattern_count_threshold > 0),
  pattern_rate_threshold_bps integer not null default 200 check (pattern_rate_threshold_bps between 0 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.platform_payment_risk_policy (singleton)
values (true)
on conflict (singleton) do nothing;

alter table public.platform_payment_risk_policy enable row level security;
revoke all on table public.platform_payment_risk_policy from public, anon, authenticated;
grant select, update on table public.platform_payment_risk_policy to service_role;

create or replace function public.reconcile_purchase_payment_event(
  p_stripe_event_id text,
  p_event_type text,
  p_stripe_payment_intent_id text,
  p_stripe_charge_id text,
  p_stripe_refund_id text,
  p_stripe_dispute_id text,
  p_amount_cents integer,
  p_currency text,
  p_dispute_status text default null
)
returns table (
  purchase_id uuid,
  entitlement_id uuid,
  organization_id uuid,
  absorbed_amount_cents integer,
  already_processed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase public.campaign_purchases%rowtype;
  v_entitlement public.customer_entitlements%rowtype;
  v_policy public.platform_payment_risk_policy%rowtype;
  v_loss_cents integer := 0;
  v_absorb_cents integer := 0;
  v_lifetime_paid_out_cents bigint := 0;
  v_tolerance_cents bigint := 0;
  v_already_absorbed_cents bigint := 0;
  v_campaign_paid_out boolean := false;
  v_total_paid_cents integer := 0;
  v_refund_delta integer := 0;
begin
  if nullif(btrim(p_stripe_event_id), '') is null then
    raise exception 'stripe event id is required';
  end if;

  if exists (
    select 1 from public.organization_earnings_ledger
    where stripe_event_id = btrim(p_stripe_event_id)
  ) then
    return query select null::uuid, null::uuid, null::uuid, 0, true;
    return;
  end if;

  select * into v_purchase
  from public.campaign_purchases
  where stripe_payment_intent_id = nullif(btrim(p_stripe_payment_intent_id), '')
  for update;

  if not found then
    raise exception 'purchase could not be matched to Stripe payment intent';
  end if;

  select * into v_entitlement
  from public.customer_entitlements
  where purchase_id = v_purchase.id
  order by created_at desc
  limit 1
  for update;

  select * into v_policy
  from public.platform_payment_risk_policy
  where singleton = true;

  v_total_paid_cents := round(v_purchase.amount_paid * 100)::integer;

  if p_event_type = 'charge.refunded' then
    v_refund_delta := greatest(coalesce(p_amount_cents, 0) - coalesce(v_purchase.refunded_amount_cents, 0), 0);
    v_loss_cents := least(v_refund_delta, greatest(v_total_paid_cents - coalesce(v_purchase.refunded_amount_cents, 0), 0));

    update public.campaign_purchases
    set
      stripe_charge_id = coalesce(nullif(btrim(p_stripe_charge_id), ''), stripe_charge_id),
      stripe_latest_refund_id = coalesce(nullif(btrim(p_stripe_refund_id), ''), stripe_latest_refund_id),
      refunded_amount_cents = greatest(coalesce(p_amount_cents, 0), refunded_amount_cents),
      payment_status = case
        when greatest(coalesce(p_amount_cents, 0), refunded_amount_cents) >= v_total_paid_cents then 'refunded'
        else 'partially_refunded'
      end
    where id = v_purchase.id;

    if v_entitlement.id is not null and greatest(coalesce(p_amount_cents, 0), v_purchase.refunded_amount_cents) >= v_total_paid_cents then
      update public.customer_entitlements
      set status = 'revoked', revoked_at = coalesce(revoked_at, now()), updated_at = now()
      where id = v_entitlement.id and status not in ('expired', 'revoked', 'replaced', 'cancelled');
    end if;
  elsif p_event_type = 'charge.dispute.created' then
    v_loss_cents := greatest(coalesce(p_amount_cents, 0), 0);

    update public.campaign_purchases
    set stripe_charge_id = coalesce(nullif(btrim(p_stripe_charge_id), ''), stripe_charge_id),
        stripe_dispute_id = nullif(btrim(p_stripe_dispute_id), ''),
        disputed_at = coalesce(disputed_at, now()),
        dispute_status = coalesce(nullif(btrim(p_dispute_status), ''), 'needs_response'),
        payment_status = 'disputed'
    where id = v_purchase.id;

    if v_entitlement.id is not null then
      update public.customer_entitlements
      set status = 'suspended', updated_at = now()
      where id = v_entitlement.id and status = 'active';
    end if;
  elsif p_event_type = 'charge.dispute.closed' and p_dispute_status = 'won' then
    insert into public.organization_earnings_ledger (
      organization_id, campaign_id, purchase_id, entry_type, amount_cents,
      currency, stripe_event_id, idempotency_key, description, metadata
    ) values (
      v_purchase.organization_workspace_id, v_purchase.campaign_id, v_purchase.id,
      'dispute_reversal', greatest(coalesce(p_amount_cents, 0), 1), lower(p_currency),
      btrim(p_stripe_event_id), 'stripe:' || btrim(p_stripe_event_id) || ':dispute_reversal',
      'Stripe dispute won', jsonb_build_object('stripe_dispute_id', p_stripe_dispute_id)
    );

    insert into public.organization_earnings_ledger (
      organization_id, campaign_id, purchase_id, entry_type, amount_cents,
      currency, stripe_event_id, idempotency_key, description, metadata
    )
    select
      v_purchase.organization_workspace_id, v_purchase.campaign_id, v_purchase.id,
      'platform_loss', -sum(amount_cents)::integer, lower(p_currency),
      btrim(p_stripe_event_id), 'stripe:' || btrim(p_stripe_event_id) || ':platform_loss_reversal',
      'Recovered previously absorbed dispute loss', jsonb_build_object('stripe_dispute_id', p_stripe_dispute_id)
    from public.organization_earnings_ledger
    where purchase_id = v_purchase.id
      and entry_type = 'platform_loss'
      and amount_cents > 0
      and metadata ->> 'stripe_dispute_id' = p_stripe_dispute_id
    having sum(amount_cents) > 0;

    update public.campaign_purchases
    set dispute_status = 'won', payment_status = 'paid'
    where id = v_purchase.id;

    if v_entitlement.id is not null then
      update public.customer_entitlements
      set status = case when expires_at is null or expires_at > now() then 'active' else 'expired' end,
          updated_at = now()
      where id = v_entitlement.id and status = 'suspended';
    end if;

    return query select v_purchase.id, v_entitlement.id, v_purchase.organization_workspace_id, 0, false;
    return;
  elsif p_event_type = 'charge.dispute.closed' then
    update public.campaign_purchases
    set dispute_status = coalesce(nullif(btrim(p_dispute_status), ''), 'lost'),
        payment_status = 'dispute_lost'
    where id = v_purchase.id;

    if v_entitlement.id is not null then
      update public.customer_entitlements
      set status = 'revoked', revoked_at = coalesce(revoked_at, now()), updated_at = now()
      where id = v_entitlement.id and status not in ('expired', 'revoked', 'replaced', 'cancelled');
    end if;

    return query select v_purchase.id, v_entitlement.id, v_purchase.organization_workspace_id, 0, false;
    return;
  else
    update public.campaign_purchases
    set dispute_status = coalesce(nullif(btrim(p_dispute_status), ''), dispute_status)
    where id = v_purchase.id;

    return query select v_purchase.id, v_entitlement.id, v_purchase.organization_workspace_id, 0, false;
    return;
  end if;

  if v_loss_cents > 0 then
    insert into public.organization_earnings_ledger (
      organization_id, campaign_id, purchase_id, entry_type, amount_cents,
      currency, stripe_event_id, idempotency_key, description, metadata
    ) values (
      v_purchase.organization_workspace_id, v_purchase.campaign_id, v_purchase.id,
      case when p_event_type = 'charge.refunded' then 'refund' else 'dispute' end,
      -v_loss_cents, lower(p_currency), btrim(p_stripe_event_id),
      'stripe:' || btrim(p_stripe_event_id) || ':loss',
      case when p_event_type = 'charge.refunded' then 'Stripe refund' else 'Stripe dispute opened' end,
      jsonb_build_object(
        'stripe_charge_id', p_stripe_charge_id,
        'stripe_refund_id', p_stripe_refund_id,
        'stripe_dispute_id', p_stripe_dispute_id
      )
    );

    select exists (
      select 1 from public.organization_transfers
      where organization_id = v_purchase.organization_workspace_id
        and campaign_id = v_purchase.campaign_id
        and status = 'completed'
    ) into v_campaign_paid_out;

    if v_campaign_paid_out then
      select coalesce(sum(amount_cents), 0)
      into v_lifetime_paid_out_cents
      from public.organization_transfers
      where organization_id = v_purchase.organization_workspace_id
        and status = 'completed';

      v_tolerance_cents := greatest(
        v_policy.minimum_loss_tolerance_cents,
        floor(v_lifetime_paid_out_cents * v_policy.lifetime_payout_tolerance_bps / 10000.0)::bigint
      );

      select coalesce(sum(amount_cents), 0)
      into v_already_absorbed_cents
      from public.organization_earnings_ledger
      where organization_id = v_purchase.organization_workspace_id
        and entry_type = 'platform_loss';

      v_absorb_cents := least(
        v_loss_cents,
        greatest(v_tolerance_cents - greatest(v_already_absorbed_cents, 0), 0)::integer
      );

      if v_absorb_cents > 0 then
        insert into public.organization_earnings_ledger (
          organization_id, campaign_id, purchase_id, entry_type, amount_cents,
          currency, stripe_event_id, idempotency_key, description, metadata
        ) values (
          v_purchase.organization_workspace_id, v_purchase.campaign_id, v_purchase.id,
          'platform_loss', v_absorb_cents, lower(p_currency), btrim(p_stripe_event_id),
          'stripe:' || btrim(p_stripe_event_id) || ':platform_loss',
          'RaiseHub absorbed post-payout loss within policy tolerance',
          jsonb_build_object(
            'stripe_refund_id', p_stripe_refund_id,
            'stripe_dispute_id', p_stripe_dispute_id,
            'tolerance_cents', v_tolerance_cents
          )
        );
      end if;
    end if;
  end if;

  return query select v_purchase.id, v_entitlement.id, v_purchase.organization_workspace_id, v_absorb_cents, false;
end;
$$;

revoke all on function public.reconcile_purchase_payment_event(text, text, text, text, text, text, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.reconcile_purchase_payment_event(text, text, text, text, text, text, integer, text, text)
  to service_role;

comment on function public.reconcile_purchase_payment_event(text, text, text, text, text, text, integer, text, text) is
  'Atomically reconciles Stripe refunds and disputes, updates pass access, records signed ledger entries, and absorbs small post-payout losses within policy tolerance.';
