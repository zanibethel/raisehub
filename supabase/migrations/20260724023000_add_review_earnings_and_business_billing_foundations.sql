-- =============================================================================
-- Campaign review audit, Organization earnings, and Business billing foundations
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Campaign review decision history
-- -----------------------------------------------------------------------------

create table if not exists public.campaign_review_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  organization_id uuid references public.organizations(id) on delete restrict,
  decision_source text not null,
  decision text not null,
  previous_review_status text,
  resulting_review_status text not null,
  risk_level text not null default 'unknown',
  risk_flags jsonb not null default '[]'::jsonb,
  check_results jsonb not null default '{}'::jsonb,
  reason text,
  internal_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint campaign_review_events_source_valid
    check (decision_source in ('automation', 'owner', 'admin', 'system')),
  constraint campaign_review_events_decision_valid
    check (decision in (
      'submitted',
      'auto_approved',
      'manual_review_required',
      'approved',
      'changes_requested',
      'rejected',
      'suspended',
      'reopened'
    )),
  constraint campaign_review_events_result_status_valid
    check (resulting_review_status in (
      'not_submitted',
      'pending',
      'approved',
      'changes_requested',
      'rejected',
      'suspended'
    )),
  constraint campaign_review_events_risk_level_valid
    check (risk_level in ('unknown', 'low', 'medium', 'high', 'blocked'))
);

create index if not exists campaign_review_events_campaign_created_idx
  on public.campaign_review_events (campaign_id, created_at desc);

create index if not exists campaign_review_events_queue_idx
  on public.campaign_review_events (resulting_review_status, risk_level, created_at desc);

alter table public.campaign_review_events enable row level security;
revoke all on table public.campaign_review_events from public, anon, authenticated;
grant select, insert on table public.campaign_review_events to service_role;

comment on table public.campaign_review_events is
  'Append-only audit history for automated and human campaign review decisions.';

-- -----------------------------------------------------------------------------
-- Immutable Organization earnings ledger
-- -----------------------------------------------------------------------------

create table if not exists public.organization_earnings_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  campaign_id uuid references public.campaigns(id) on delete restrict,
  purchase_id uuid references public.campaign_purchases(id) on delete restrict,
  transfer_id uuid references public.organization_transfers(id) on delete restrict,
  entry_type text not null,
  amount_cents integer not null,
  currency text not null default 'usd',
  available_on timestamptz,
  stripe_event_id text,
  idempotency_key text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint organization_earnings_ledger_entry_type_valid
    check (entry_type in (
      'purchase_earning',
      'platform_fee',
      'processing_fee',
      'refund',
      'dispute',
      'dispute_reversal',
      'transfer',
      'transfer_reversal',
      'reserve_hold',
      'reserve_release',
      'manual_adjustment'
    )),
  constraint organization_earnings_ledger_currency_format
    check (currency = lower(currency) and char_length(currency) = 3),
  constraint organization_earnings_ledger_amount_nonzero
    check (amount_cents <> 0)
);

create unique index if not exists organization_earnings_ledger_idempotency_unique_idx
  on public.organization_earnings_ledger (idempotency_key);

create index if not exists organization_earnings_ledger_org_created_idx
  on public.organization_earnings_ledger (organization_id, created_at desc);

create index if not exists organization_earnings_ledger_campaign_created_idx
  on public.organization_earnings_ledger (campaign_id, created_at desc)
  where campaign_id is not null;

create index if not exists organization_earnings_ledger_available_idx
  on public.organization_earnings_ledger (organization_id, available_on)
  where available_on is not null;

alter table public.organization_earnings_ledger enable row level security;
revoke all on table public.organization_earnings_ledger from public, anon, authenticated;
grant select, insert on table public.organization_earnings_ledger to service_role;

comment on table public.organization_earnings_ledger is
  'Append-only signed-cent ledger for Organization earnings, holds, refunds, disputes, and transfers.';

create or replace view public.organization_earnings_balances
with (security_invoker = false)
as
select
  organization_id,
  currency,
  coalesce(sum(amount_cents), 0)::bigint as ledger_balance_cents,
  coalesce(sum(amount_cents) filter (
    where available_on is null or available_on <= now()
  ), 0)::bigint as available_balance_cents,
  max(created_at) as last_entry_at
from public.organization_earnings_ledger
group by organization_id, currency;

revoke all on public.organization_earnings_balances from public, anon, authenticated;
grant select on public.organization_earnings_balances to service_role;

-- -----------------------------------------------------------------------------
-- Business Stripe billing account and subscription state
-- -----------------------------------------------------------------------------

create table if not exists public.business_billing_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  livemode boolean not null default false,
  plan_code text not null default 'free',
  subscription_status text not null default 'inactive',
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  canceled_at timestamptz,
  ended_at timestamptz,
  last_invoice_status text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_billing_accounts_status_valid
    check (subscription_status in (
      'inactive',
      'trialing',
      'active',
      'past_due',
      'unpaid',
      'paused',
      'canceled',
      'incomplete',
      'incomplete_expired'
    ))
);

create unique index if not exists business_billing_accounts_business_unique_idx
  on public.business_billing_accounts (business_id);

create unique index if not exists business_billing_accounts_customer_unique_idx
  on public.business_billing_accounts (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists business_billing_accounts_subscription_unique_idx
  on public.business_billing_accounts (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists business_billing_accounts_status_idx
  on public.business_billing_accounts (subscription_status, current_period_end);

alter table public.business_billing_accounts enable row level security;
revoke all on table public.business_billing_accounts from public, anon, authenticated;
grant select, insert, update on table public.business_billing_accounts to service_role;

comment on table public.business_billing_accounts is
  'Canonical Stripe customer and subscription state for each Business workspace.';

create table if not exists public.business_billing_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  stripe_event_id text not null,
  stripe_object_id text,
  event_type text not null,
  subscription_status text,
  amount_due_cents integer,
  amount_paid_cents integer,
  currency text,
  livemode boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint business_billing_events_currency_format
    check (currency is null or (currency = lower(currency) and char_length(currency) = 3)),
  constraint business_billing_events_amount_due_nonnegative
    check (amount_due_cents is null or amount_due_cents >= 0),
  constraint business_billing_events_amount_paid_nonnegative
    check (amount_paid_cents is null or amount_paid_cents >= 0)
);

create unique index if not exists business_billing_events_stripe_event_unique_idx
  on public.business_billing_events (stripe_event_id);

create index if not exists business_billing_events_business_created_idx
  on public.business_billing_events (business_id, created_at desc);

alter table public.business_billing_events enable row level security;
revoke all on table public.business_billing_events from public, anon, authenticated;
grant select, insert on table public.business_billing_events to service_role;

comment on table public.business_billing_events is
  'Append-only Stripe billing event history for Business subscription reconciliation.';
