begin;

create or replace function public.fulfill_paid_checkout_attempt(
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_amount_total_cents integer,
  p_currency text,
  p_payment_status text
)
returns table (
  checkout_attempt_id uuid,
  purchase_id uuid,
  entitlement_id uuid,
  already_fulfilled boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.checkout_attempts%rowtype;
  v_result record;
begin
  if nullif(btrim(p_stripe_checkout_session_id), '') is null then
    raise exception 'stripe checkout session id is required';
  end if;

  select *
  into v_attempt
  from public.checkout_attempts
  where stripe_checkout_session_id = btrim(p_stripe_checkout_session_id)
  for update;

  if not found then
    raise exception 'checkout attempt was not found';
  end if;

  if v_attempt.purchase_id is not null then
    return query
    select
      v_attempt.id,
      v_attempt.purchase_id,
      ce.id,
      true
    from public.customer_entitlements ce
    where ce.purchase_id = v_attempt.purchase_id
    union all
    select v_attempt.id, v_attempt.purchase_id, null::uuid, true
    where not exists (
      select 1
      from public.customer_entitlements ce2
      where ce2.purchase_id = v_attempt.purchase_id
    )
    limit 1;
    return;
  end if;

  if lower(coalesce(p_payment_status, '')) not in ('paid', 'no_payment_required') then
    raise exception 'checkout session is not paid';
  end if;

  if p_amount_total_cents is null
    or p_amount_total_cents <> v_attempt.expected_amount_cents then
    raise exception 'checkout amount does not match the server snapshot';
  end if;

  if lower(coalesce(p_currency, '')) <> v_attempt.currency then
    raise exception 'checkout currency does not match the server snapshot';
  end if;

  if v_attempt.status in ('canceled', 'expired') then
    raise exception 'checkout attempt is no longer fulfillable';
  end if;

  if v_attempt.expires_at is not null and v_attempt.expires_at < now() then
    raise exception 'checkout attempt has expired';
  end if;

  select *
  into v_result
  from public.create_campaign_purchase_with_entitlement(
    v_attempt.campaign_id,
    v_attempt.user_id,
    v_attempt.buyer_email,
    v_attempt.selected_organization_id,
    v_attempt.donation_amount,
    coalesce(v_attempt.campaign_seller_name_snapshot, v_attempt.seller_name),
    round(v_attempt.expected_amount_cents::numeric / 100, 2),
    v_attempt.platform_fee,
    v_attempt.organization_earnings,
    v_attempt.is_demo,
    v_attempt.demo_group,
    v_attempt.grant_entitlement,
    v_attempt.pricing_rule_id,
    v_attempt.pricing_scope,
    v_attempt.pass_price_charged,
    v_attempt.platform_fee_percent,
    v_attempt.organization_pass_earnings,
    v_attempt.pricing_resolved_at
  );

  update public.campaign_purchases
  set
    payment_status = 'paid',
    stripe_checkout_session_id = btrim(p_stripe_checkout_session_id),
    stripe_payment_intent_id = nullif(btrim(p_stripe_payment_intent_id), ''),
    campaign_seller_id = v_attempt.campaign_seller_id,
    campaign_seller_name_snapshot = v_attempt.campaign_seller_name_snapshot
  where id = v_result.purchase_id;

  update public.checkout_attempts
  set
    status = 'paid',
    stripe_payment_intent_id = nullif(btrim(p_stripe_payment_intent_id), ''),
    purchase_id = v_result.purchase_id,
    fulfilled_at = now(),
    updated_at = now()
  where id = v_attempt.id;

  return query
  select
    v_attempt.id,
    v_result.purchase_id,
    v_result.entitlement_id,
    false;
end;
$$;

revoke all on function public.fulfill_paid_checkout_attempt(text, text, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.fulfill_paid_checkout_attempt(text, text, integer, text, text)
  to service_role;

comment on function public.fulfill_paid_checkout_attempt(text, text, integer, text, text) is
  'Idempotently fulfills one server-priced Stripe Checkout attempt and preserves immutable managed seller attribution.';

commit;
