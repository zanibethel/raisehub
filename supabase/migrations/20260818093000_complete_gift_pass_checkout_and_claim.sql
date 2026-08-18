-- =============================================================================
-- Complete Gift a Pass checkout + claim lifecycle
-- =============================================================================
-- Gift purchases use the same hardened Stripe checkout_attempt pipeline as
-- normal pass purchases, but intentionally do not grant access to the purchaser.
-- A six-month entitlement is created for the recipient only when the gift is
-- claimed. Raw claim tokens remain application-only; Postgres stores hashes.
-- =============================================================================

alter table public.checkout_attempts
  add column if not exists purchase_kind text not null default 'self';

alter table public.checkout_attempts
  add column if not exists gift_pass_id uuid references public.gift_passes(id) on delete set null;

alter table public.checkout_attempts
  drop constraint if exists checkout_attempts_purchase_kind_check;

alter table public.checkout_attempts
  add constraint checkout_attempts_purchase_kind_check
  check (purchase_kind in ('self', 'gift'));

create unique index if not exists checkout_attempts_gift_pass_uidx
  on public.checkout_attempts (gift_pass_id)
  where gift_pass_id is not null;

create index if not exists gift_passes_purchase_id_idx
  on public.gift_passes (purchase_id)
  where purchase_id is not null;

-- -----------------------------------------------------------------------------
-- Create a paid-pass purchase without granting the purchaser an entitlement.
-- Used only for Gift a Pass. Payment status starts as test_paid so the existing
-- paid-transition trigger can create earnings when Stripe fulfillment changes it
-- to paid. Demo gifts remain test_paid by design.
-- -----------------------------------------------------------------------------
create or replace function public.create_campaign_gift_purchase(
  p_campaign_id uuid,
  p_user_id uuid,
  p_buyer_email text,
  p_selected_organization_id uuid,
  p_donation_amount numeric,
  p_seller_name text,
  p_amount_paid numeric,
  p_platform_fee numeric,
  p_organization_earnings numeric,
  p_is_demo boolean,
  p_demo_group text,
  p_pricing_rule_id uuid,
  p_pricing_scope text,
  p_pass_price_charged numeric,
  p_platform_fee_percent numeric,
  p_organization_pass_earnings numeric,
  p_pricing_resolved_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase_id uuid;
  v_organization_workspace_id uuid;
  v_donation numeric := round(greatest(coalesce(p_donation_amount, 0), 0), 2);
  v_amount numeric := round(coalesce(p_amount_paid, 0), 2);
  v_fee numeric := round(coalesce(p_platform_fee, 0), 2);
  v_org_earnings numeric := round(coalesce(p_organization_earnings, 0), 2);
  v_pass_price numeric := round(coalesce(p_pass_price_charged, 0), 2);
  v_fee_percent numeric := round(coalesce(p_platform_fee_percent, 0), 2);
  v_org_pass numeric := round(coalesce(p_organization_pass_earnings, 0), 2);
begin
  if p_campaign_id is null or p_user_id is null or p_selected_organization_id is null then
    raise exception 'gift purchase ownership is incomplete';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'gift purchaser profile does not exist';
  end if;

  if not exists (
    select 1 from public.campaigns c
    where c.id = p_campaign_id
      and c.organization_id = p_selected_organization_id
      and coalesce(c.is_demo, false) is not distinct from coalesce(p_is_demo, false)
      and (coalesce(p_is_demo, false) = false or c.demo_group is not distinct from nullif(btrim(p_demo_group), ''))
  ) then
    raise exception 'gift campaign does not match purchase environment';
  end if;

  select o.id
  into v_organization_workspace_id
  from public.organizations o
  where o.legacy_profile_id = p_selected_organization_id
    and o.status = 'active'
    and o.archived_at is null
    and coalesce(o.is_demo, false) is not distinct from coalesce(p_is_demo, false)
    and (coalesce(p_is_demo, false) = false or o.demo_group is not distinct from nullif(btrim(p_demo_group), ''))
  limit 1;

  if v_organization_workspace_id is null then
    raise exception 'gift canonical organization does not exist';
  end if;

  if coalesce(p_is_demo, false) = false and nullif(btrim(p_demo_group), '') is not null then
    raise exception 'production gift purchases cannot have a demo_group';
  end if;

  if v_pass_price <= 0 then raise exception 'gift pass price must be positive'; end if;
  if nullif(btrim(p_pricing_scope), '') is null then raise exception 'gift pricing scope is required'; end if;
  if p_pricing_resolved_at is null then raise exception 'gift pricing resolution timestamp is required'; end if;
  if v_fee_percent < 0 or v_fee_percent > 100 then raise exception 'gift platform fee percent is invalid'; end if;
  if v_amount <= 0 or v_fee < 0 or v_org_earnings < 0 or v_org_pass < 0 then
    raise exception 'gift pricing amounts are invalid';
  end if;
  if round(v_pass_price + v_donation, 2) <> v_amount then
    raise exception 'gift pass price and donation must equal amount paid';
  end if;
  if round(v_fee + v_org_pass, 2) <> v_pass_price then
    raise exception 'gift platform fee and organization share must equal pass price';
  end if;
  if round(v_pass_price * (v_fee_percent / 100), 2) <> v_fee then
    raise exception 'gift platform fee amount does not match percentage';
  end if;
  if round(v_org_pass + v_donation, 2) <> v_org_earnings then
    raise exception 'gift organization earnings do not match pass share plus donation';
  end if;

  insert into public.campaign_purchases (
    campaign_id,
    user_id,
    buyer_email,
    amount_paid,
    platform_fee,
    organization_earnings,
    payment_status,
    selected_organization_id,
    organization_workspace_id,
    donation_amount,
    seller_name,
    is_demo,
    demo_group,
    pricing_rule_id,
    pricing_scope,
    pass_price_charged,
    platform_fee_percent,
    organization_pass_earnings,
    pricing_resolved_at
  ) values (
    p_campaign_id,
    p_user_id,
    nullif(btrim(p_buyer_email), ''),
    v_amount,
    v_fee,
    v_org_earnings,
    'test_paid',
    p_selected_organization_id,
    v_organization_workspace_id,
    v_donation,
    nullif(btrim(p_seller_name), ''),
    coalesce(p_is_demo, false),
    case when coalesce(p_is_demo, false) then nullif(btrim(p_demo_group), '') else null end,
    p_pricing_rule_id,
    nullif(btrim(p_pricing_scope), ''),
    v_pass_price,
    v_fee_percent,
    v_org_pass,
    p_pricing_resolved_at
  )
  returning id into v_purchase_id;

  return v_purchase_id;
end;
$$;

revoke all on function public.create_campaign_gift_purchase(
  uuid, uuid, text, uuid, numeric, text, numeric, numeric, numeric,
  boolean, text, uuid, text, numeric, numeric, numeric, timestamptz
) from public, anon, authenticated;
grant execute on function public.create_campaign_gift_purchase(
  uuid, uuid, text, uuid, numeric, text, numeric, numeric, numeric,
  boolean, text, uuid, text, numeric, numeric, numeric, timestamptz
) to service_role;

-- -----------------------------------------------------------------------------
-- Stripe fulfillment: normal checkouts keep their existing behavior; gift
-- checkouts create the paid purchase and activate the gift without granting the
-- purchaser access.
-- -----------------------------------------------------------------------------
create or replace function public.fulfill_paid_checkout_attempt(
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_amount_total_cents integer,
  p_currency text,
  p_payment_status text
)
returns table(
  checkout_attempt_id uuid,
  purchase_id uuid,
  entitlement_id uuid,
  already_fulfilled boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt public.checkout_attempts%rowtype;
  v_result record;
  v_purchase_id uuid;
begin
  if nullif(btrim(p_stripe_checkout_session_id), '') is null then
    raise exception 'stripe checkout session id is required';
  end if;

  select * into v_attempt
  from public.checkout_attempts
  where stripe_checkout_session_id = btrim(p_stripe_checkout_session_id)
  for update;

  if not found then raise exception 'checkout attempt was not found'; end if;

  if v_attempt.purchase_id is not null then
    return query
    select v_attempt.id, v_attempt.purchase_id, ce.id, true
    from public.customer_entitlements ce
    where ce.purchase_id = v_attempt.purchase_id
    union all
    select v_attempt.id, v_attempt.purchase_id, null::uuid, true
    where not exists (
      select 1 from public.customer_entitlements ce2
      where ce2.purchase_id = v_attempt.purchase_id
    )
    limit 1;
    return;
  end if;

  if lower(coalesce(p_payment_status, '')) not in ('paid', 'no_payment_required') then
    raise exception 'checkout session is not paid';
  end if;
  if p_amount_total_cents is null or p_amount_total_cents <> v_attempt.expected_amount_cents then
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

  if v_attempt.purchase_kind = 'gift' then
    if v_attempt.gift_pass_id is null then
      raise exception 'gift checkout is missing its gift record';
    end if;
    if v_attempt.grant_entitlement is distinct from false then
      raise exception 'gift checkout cannot grant purchaser entitlement';
    end if;

    perform 1 from public.gift_passes g
    where g.id = v_attempt.gift_pass_id
      and g.purchaser_user_id = v_attempt.user_id
      and g.campaign_id = v_attempt.campaign_id
      and g.selected_organization_id = v_attempt.selected_organization_id
      and g.status = 'pending_payment'
      and coalesce(g.is_demo, false) is false
      and g.demo_group is null
    for update;

    if not found then raise exception 'gift checkout record is not fulfillable'; end if;

    v_purchase_id := public.create_campaign_gift_purchase(
      v_attempt.campaign_id,
      v_attempt.user_id,
      v_attempt.buyer_email,
      v_attempt.selected_organization_id,
      v_attempt.donation_amount,
      coalesce(v_attempt.campaign_seller_name_snapshot, v_attempt.seller_name),
      round(v_attempt.expected_amount_cents::numeric / 100, 2),
      v_attempt.platform_fee,
      v_attempt.organization_earnings,
      false,
      null,
      v_attempt.pricing_rule_id,
      v_attempt.pricing_scope,
      v_attempt.pass_price_charged,
      v_attempt.platform_fee_percent,
      v_attempt.organization_pass_earnings,
      v_attempt.pricing_resolved_at
    );

    update public.campaign_purchases
    set payment_status = 'paid',
        stripe_checkout_session_id = btrim(p_stripe_checkout_session_id),
        stripe_payment_intent_id = nullif(btrim(p_stripe_payment_intent_id), ''),
        campaign_seller_id = v_attempt.campaign_seller_id,
        campaign_seller_name_snapshot = v_attempt.campaign_seller_name_snapshot
    where id = v_purchase_id;

    update public.gift_passes
    set purchase_id = v_purchase_id,
        status = 'purchased',
        updated_at = now()
    where id = v_attempt.gift_pass_id;
  else
    select * into v_result
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
    v_purchase_id := v_result.purchase_id;

    update public.campaign_purchases
    set payment_status = 'paid',
        stripe_checkout_session_id = btrim(p_stripe_checkout_session_id),
        stripe_payment_intent_id = nullif(btrim(p_stripe_payment_intent_id), ''),
        campaign_seller_id = v_attempt.campaign_seller_id,
        campaign_seller_name_snapshot = v_attempt.campaign_seller_name_snapshot
    where id = v_purchase_id;
  end if;

  update public.checkout_attempts
  set status = 'paid',
      stripe_payment_intent_id = nullif(btrim(p_stripe_payment_intent_id), ''),
      purchase_id = v_purchase_id,
      fulfilled_at = now(),
      updated_at = now()
  where id = v_attempt.id;

  return query
  select
    v_attempt.id,
    v_purchase_id,
    case when v_attempt.purchase_kind = 'gift' then null::uuid else v_result.entitlement_id end,
    false;
end;
$$;

revoke all on function public.fulfill_paid_checkout_attempt(text,text,integer,text,text)
  from public, anon, authenticated;
grant execute on function public.fulfill_paid_checkout_attempt(text,text,integer,text,text)
  to service_role;

-- -----------------------------------------------------------------------------
-- Claim a purchased gift using a SHA-256 token hash. The authenticated account
-- must match recipient_email when the purchaser supplied one. Access starts at
-- claim time and lasts six months.
-- -----------------------------------------------------------------------------
create or replace function public.claim_gift_pass(p_claim_token_hash text)
returns table(
  gift_pass_id uuid,
  entitlement_id uuid,
  expires_at timestamptz,
  already_claimed boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_email text := lower(nullif(btrim(auth.jwt() ->> 'email'), ''));
  v_profile public.profiles%rowtype;
  v_gift public.gift_passes%rowtype;
  v_purchase public.campaign_purchases%rowtype;
  v_entitlement_id uuid;
  v_starts_at timestamptz;
  v_expires_at timestamptz;
begin
  if v_actor is null then raise exception 'sign in to claim this gift'; end if;
  if nullif(btrim(p_claim_token_hash), '') is null then raise exception 'gift claim token is required'; end if;

  select * into v_profile from public.profiles where id = v_actor;
  if not found then raise exception 'claiming profile does not exist'; end if;

  select * into v_gift
  from public.gift_passes
  where claim_token_hash = lower(btrim(p_claim_token_hash))
  for update;

  if not found then raise exception 'gift link is invalid'; end if;

  if v_gift.status = 'claimed' then
    if v_gift.claimed_by_user_id is distinct from v_actor then
      raise exception 'this gift has already been claimed';
    end if;
    return query
    select v_gift.id, v_gift.entitlement_id, ce.expires_at, true
    from public.customer_entitlements ce
    where ce.id = v_gift.entitlement_id;
    return;
  end if;

  if v_gift.status not in ('purchased', 'delivered') then
    raise exception 'this gift is not available to claim';
  end if;
  if v_gift.claim_expires_at is not null and v_gift.claim_expires_at <= now() then
    raise exception 'this gift claim link has expired';
  end if;
  if v_gift.recipient_email is not null
     and lower(btrim(v_gift.recipient_email)) is distinct from v_actor_email then
    raise exception 'sign in with the recipient email address to claim this gift';
  end if;
  if coalesce(v_profile.is_demo, false) is distinct from coalesce(v_gift.is_demo, false)
     or (coalesce(v_gift.is_demo, false) and v_profile.demo_group is distinct from v_gift.demo_group) then
    raise exception 'gift environment does not match claiming account';
  end if;
  if v_gift.purchase_id is null then raise exception 'gift payment has not been completed'; end if;

  select * into v_purchase
  from public.campaign_purchases
  where id = v_gift.purchase_id
  for share;

  if not found or v_purchase.payment_status not in ('paid', 'test_paid') then
    raise exception 'gift payment is not active';
  end if;
  if coalesce(v_purchase.is_demo, false) is distinct from coalesce(v_gift.is_demo, false)
     or (coalesce(v_gift.is_demo, false) and v_purchase.demo_group is distinct from v_gift.demo_group) then
    raise exception 'gift purchase environment mismatch';
  end if;

  if exists (select 1 from public.customer_entitlements ce where ce.purchase_id = v_purchase.id) then
    raise exception 'gift purchase already has an entitlement';
  end if;

  v_starts_at := now();
  v_expires_at := v_starts_at + interval '6 months';

  insert into public.customer_entitlements (
    user_id,
    purchase_id,
    entitlement_type,
    status,
    starts_at,
    expires_at,
    is_demo,
    demo_group
  ) values (
    v_actor,
    v_purchase.id,
    'purchased_pass',
    'active',
    v_starts_at,
    v_expires_at,
    coalesce(v_gift.is_demo, false),
    case when coalesce(v_gift.is_demo, false) then v_gift.demo_group else null end
  ) returning id into v_entitlement_id;

  update public.gift_passes
  set status = 'claimed',
      claimed_by_user_id = v_actor,
      claimed_at = v_starts_at,
      entitlement_id = v_entitlement_id,
      updated_at = now()
  where id = v_gift.id;

  return query select v_gift.id, v_entitlement_id, v_expires_at, false;
end;
$$;

revoke all on function public.claim_gift_pass(text) from public, anon;
grant execute on function public.claim_gift_pass(text) to authenticated, service_role;

-- Refunds make an unclaimed gift unavailable; claimed access is already revoked
-- by the existing payment reconciliation path through purchase_id.
create or replace function public.sync_gift_pass_payment_status()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.payment_status = 'refunded' and old.payment_status is distinct from 'refunded' then
    update public.gift_passes
    set status = 'refunded', updated_at = now()
    where purchase_id = new.id
      and status <> 'refunded';
  end if;
  return new;
end;
$$;

drop trigger if exists sync_gift_pass_payment_status on public.campaign_purchases;
create trigger sync_gift_pass_payment_status
after update of payment_status on public.campaign_purchases
for each row execute function public.sync_gift_pass_payment_status();
