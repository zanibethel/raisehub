-- =============================================================================
-- Stripe Checkout foundation and idempotent paid fulfillment
-- =============================================================================

alter table public.campaign_purchases
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text;

create unique index if not exists campaign_purchases_stripe_session_unique_idx
  on public.campaign_purchases (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists campaign_purchases_stripe_payment_intent_unique_idx
  on public.campaign_purchases (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create table if not exists public.checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  selected_organization_id uuid not null references public.profiles(id) on delete restrict,
  buyer_email text,
  seller_name text,
  donation_amount numeric not null default 0,
  expected_amount_cents integer not null,
  currency text not null default 'usd',
  grant_entitlement boolean not null default true,
  pricing_rule_id uuid,
  pricing_scope text,
  pass_price_charged numeric,
  platform_fee numeric not null,
  platform_fee_percent numeric,
  organization_pass_earnings numeric,
  organization_earnings numeric not null,
  pricing_resolved_at timestamptz,
  is_demo boolean not null default false,
  demo_group text,
  status text not null default 'created',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  purchase_id uuid references public.campaign_purchases(id) on delete restrict,
  expires_at timestamptz,
  fulfilled_at timestamptz,
  canceled_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checkout_attempts_expected_amount_nonnegative
    check (expected_amount_cents >= 0),
  constraint checkout_attempts_currency_format
    check (currency = lower(currency) and char_length(currency) = 3),
  constraint checkout_attempts_status_valid
    check (status in ('created', 'open', 'paid', 'failed', 'canceled', 'expired')),
  constraint checkout_attempts_demo_group_valid
    check (is_demo or demo_group is null)
);

create unique index if not exists checkout_attempts_stripe_session_unique_idx
  on public.checkout_attempts (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists checkout_attempts_stripe_payment_intent_unique_idx
  on public.checkout_attempts (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index if not exists checkout_attempts_purchase_unique_idx
  on public.checkout_attempts (purchase_id)
  where purchase_id is not null;

create index if not exists checkout_attempts_user_created_idx
  on public.checkout_attempts (user_id, created_at desc);

create index if not exists checkout_attempts_campaign_created_idx
  on public.checkout_attempts (campaign_id, created_at desc);

alter table public.checkout_attempts enable row level security;

revoke all on table public.checkout_attempts from public, anon, authenticated;
grant select, insert, update on table public.checkout_attempts to service_role;

create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  livemode boolean not null,
  payload jsonb not null,
  processing_status text not null default 'received',
  attempt_count integer not null default 0,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stripe_webhook_events_status_valid
    check (processing_status in ('received', 'processing', 'processed', 'ignored', 'failed')),
  constraint stripe_webhook_events_attempt_count_nonnegative
    check (attempt_count >= 0)
);

create index if not exists stripe_webhook_events_status_created_idx
  on public.stripe_webhook_events (processing_status, created_at);

alter table public.stripe_webhook_events enable row level security;

revoke all on table public.stripe_webhook_events from public, anon, authenticated;
grant select, insert, update on table public.stripe_webhook_events to service_role;

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
    v_attempt.seller_name,
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
    stripe_payment_intent_id = nullif(btrim(p_stripe_payment_intent_id), '')
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

comment on function public.fulfill_paid_checkout_attempt(text, text, integer, text, text) is
  'Idempotently fulfills one server-priced Stripe Checkout attempt after verified payment.';

revoke all on function public.fulfill_paid_checkout_attempt(text, text, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.fulfill_paid_checkout_attempt(text, text, integer, text, text)
  to service_role;
