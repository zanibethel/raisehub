-- =============================================================================
-- Correct organization loss allocation so RaiseHub never charges an
-- organization for the platform-fee share of a refund or dispute.
-- =============================================================================

alter table public.campaign_purchases
  add column if not exists refunded_organization_amount_cents integer not null default 0;

alter table public.campaign_purchases
  drop constraint if exists campaign_purchases_refunded_organization_amount_nonnegative;

alter table public.campaign_purchases
  add constraint campaign_purchases_refunded_organization_amount_nonnegative
  check (refunded_organization_amount_cents >= 0);

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
  v_organization_earnings_cents integer := 0;
  v_cumulative_refunded_cents integer := 0;
  v_target_organization_refund_cents integer := 0;
  v_previous_organization_refund_cents integer := 0;
  v_dispute_loss_cents integer := 0;
begin
  if nullif(btrim(p_stripe_event_id), '') is null then
    raise exception 'stripe event id is required';
  end if;

  if exists (
    select 1
    from public.organization_earnings_ledger
    where stripe_event_id = btrim(p_stripe_event_id)
  ) then
    return query select null::uuid, null::uuid, null::uuid, 0, true;
    return;
  end if;

  select *
  into v_purchase
  from public.campaign_purchases
  where stripe_payment_intent_id = nullif(btrim(p_stripe_payment_intent_id), '')
  for update;

  if not found then
    raise exception 'purchase could not be matched to Stripe payment intent';
  end if;

  select *
  into v_entitlement
  from public.customer_entitlements
  where purchase_id = v_purchase.id
  order by created_at desc
  limit 1
  for update;

  select *
  into v_policy
  from public.platform_payment_risk_policy
  where singleton = true;

  v_total_paid_cents := greatest(round(v_purchase.amount_paid * 100)::integer, 0);
  v_organization_earnings_cents := least(
    greatest(round(v_purchase.organization_earnings * 100)::integer, 0),
    v_total_paid_cents
  );

  if p_event_type = 'charge.refunded' then
    v_cumulative_refunded_cents := least(
      greatest(coalesce(p_amount_cents, 0), 0),
      v_total_paid_cents
    );
    v_previous_organization_refund_cents := least(
      greatest(coalesce(v_purchase.refunded_organization_amount_cents, 0), 0),
      v_organization_earnings_cents
    );

    if v_total_paid_cents > 0 then
      v_target_organization_refund_cents := least(
        v_organization_earnings_cents,
        round(
          v_organization_earnings_cents::numeric
          * v_cumulative_refunded_cents::numeric
          / v_total_paid_cents::numeric
        )::integer
      );
    end if;

    v_loss_cents := greatest(
      v_target_organization_refund_cents - v_previous_organization_refund_cents,
      0
    );

    update public.campaign_purchases
    set
      stripe_charge_id = coalesce(nullif(btrim(p_stripe_charge_id), ''), stripe_charge_id),
      stripe_latest_refund_id = coalesce(nullif(btrim(p_stripe_refund_id), ''), stripe_latest_refund_id),
      refunded_amount_cents = greatest(v_cumulative_refunded_cents, refunded_amount_cents),
      refunded_organization_amount_cents = greatest(
        v_target_organization_refund_cents,
        refunded_organization_amount_cents
      ),
      payment_status = case
        when greatest(v_cumulative_refunded_cents, refunded_amount_cents) >= v_total_paid_cents then 'refunded'
        else 'partially_refunded'
      end
    where id = v_purchase.id;

    if v_entitlement.id is not null
      and greatest(v_cumulative_refunded_cents, v_purchase.refunded_amount_cents) >= v_total_paid_cents then
      update public.customer_entitlements
      set
        status = 'revoked',
        revoked_at = coalesce(revoked_at, now()),
        updated_at = now()
      where id = v_entitlement.id
        and status not in ('expired', 'revoked', 'replaced', 'cancelled');
    end if;

  elsif p_event_type = 'charge.dispute.created' then
    -- A dispute debits the whole charge from RaiseHub, but only the
    -- organization's original earnings are recoverable from its ledger.
    v_dispute_loss_cents := least(
      greatest(coalesce(p_amount_cents, 0), 0),
      v_organization_earnings_cents
    );
    v_loss_cents := v_dispute_loss_cents;

    update public.campaign_purchases
    set
      stripe_charge_id = coalesce(nullif(btrim(p_stripe_charge_id), ''), stripe_charge_id),
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
    select coalesce(-sum(amount_cents), 0)::integer
    into v_dispute_loss_cents
    from public.organization_earnings_ledger
    where purchase_id = v_purchase.id
      and entry_type = 'dispute'
      and amount_cents < 0
      and metadata ->> 'stripe_dispute_id' = p_stripe_dispute_id;

    if v_dispute_loss_cents > 0 then
      insert into public.organization_earnings_ledger (
        organization_id, campaign_id, purchase_id, entry_type, amount_cents,
        currency, stripe_event_id, idempotency_key, description, metadata
      ) values (
        v_purchase.organization_workspace_id, v_purchase.campaign_id, v_purchase.id,
        'dispute_reversal', v_dispute_loss_cents, lower(p_currency),
        btrim(p_stripe_event_id), 'stripe:' || btrim(p_stripe_event_id) || ':dispute_reversal',
        'Stripe dispute won', jsonb_build_object('stripe_dispute_id', p_stripe_dispute_id)
      );
    end if;

    insert into public.organization_earnings_ledger (
      organization_id, campaign_id, purchase_id, entry_type, amount_cents,
      currency, stripe_event_id, idempotency_key, description, metadata
    )
    select
      v_purchase.organization_workspace_id, v_purchase.campaign_id, v_purchase.id,
      'platform_loss', -sum(amount_cents)::integer, lower(p_currency),
      btrim(p_stripe_event_id), 'stripe:' || btrim(p_stripe_event_id) || ':platform_loss_reversal',
      'Recovered previously absorbed dispute loss',
      jsonb_build_object('stripe_dispute_id', p_stripe_dispute_id)
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
      set
        status = case
          when expires_at is null or expires_at > now() then 'active'
          else 'expired'
        end,
        updated_at = now()
      where id = v_entitlement.id and status = 'suspended';
    end if;

    return query
    select v_purchase.id, v_entitlement.id, v_purchase.organization_workspace_id, 0, false;
    return;

  elsif p_event_type = 'charge.dispute.closed' then
    update public.campaign_purchases
    set
      dispute_status = coalesce(nullif(btrim(p_dispute_status), ''), 'lost'),
      payment_status = 'dispute_lost'
    where id = v_purchase.id;

    if v_entitlement.id is not null then
      update public.customer_entitlements
      set
        status = 'revoked',
        revoked_at = coalesce(revoked_at, now()),
        updated_at = now()
      where id = v_entitlement.id
        and status not in ('expired', 'revoked', 'replaced', 'cancelled');
    end if;

    return query
    select v_purchase.id, v_entitlement.id, v_purchase.organization_workspace_id, 0, false;
    return;

  else
    update public.campaign_purchases
    set dispute_status = coalesce(nullif(btrim(p_dispute_status), ''), dispute_status)
    where id = v_purchase.id;

    return query
    select v_purchase.id, v_entitlement.id, v_purchase.organization_workspace_id, 0, false;
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
        'stripe_dispute_id', p_stripe_dispute_id,
        'gross_event_amount_cents', p_amount_cents,
        'organization_loss_cents', v_loss_cents
      )
    );

    select exists (
      select 1
      from public.organization_transfers
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
        floor(
          v_lifetime_paid_out_cents
          * v_policy.lifetime_payout_tolerance_bps
          / 10000.0
        )::bigint
      );

      select coalesce(sum(amount_cents), 0)
      into v_already_absorbed_cents
      from public.organization_earnings_ledger
      where organization_id = v_purchase.organization_workspace_id
        and entry_type = 'platform_loss';

      v_absorb_cents := least(
        v_loss_cents,
        greatest(
          v_tolerance_cents - greatest(v_already_absorbed_cents, 0),
          0
        )::integer
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

  return query
  select v_purchase.id, v_entitlement.id, v_purchase.organization_workspace_id, v_absorb_cents, false;
end;
$$;

comment on function public.reconcile_purchase_payment_event(text, text, text, text, text, text, integer, text, text) is
  'Reconciles Stripe refunds and disputes using proportional organization-loss allocation so platform-fee amounts are never charged to organizations.';
