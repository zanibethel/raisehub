-- =============================================================================
-- Organization Stripe Connect foundation
-- =============================================================================

create table if not exists public.organization_stripe_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  stripe_account_id text not null,
  livemode boolean not null default false,
  onboarding_status text not null default 'not_started',
  details_submitted boolean not null default false,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  requirements_currently_due jsonb not null default '[]'::jsonb,
  requirements_eventually_due jsonb not null default '[]'::jsonb,
  requirements_past_due jsonb not null default '[]'::jsonb,
  disabled_reason text,
  country text,
  default_currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz,
  constraint organization_stripe_accounts_onboarding_status_valid
    check (onboarding_status in (
      'not_started',
      'in_progress',
      'restricted',
      'enabled',
      'disabled'
    )),
  constraint organization_stripe_accounts_currency_format
    check (default_currency is null or (
      default_currency = lower(default_currency)
      and char_length(default_currency) = 3
    ))
);

create unique index if not exists organization_stripe_accounts_organization_unique_idx
  on public.organization_stripe_accounts (organization_id);

create unique index if not exists organization_stripe_accounts_stripe_account_unique_idx
  on public.organization_stripe_accounts (stripe_account_id);

create index if not exists organization_stripe_accounts_status_idx
  on public.organization_stripe_accounts (onboarding_status, payouts_enabled);

alter table public.organization_stripe_accounts enable row level security;
revoke all on table public.organization_stripe_accounts from public, anon, authenticated;
grant select, insert, update on table public.organization_stripe_accounts to service_role;

comment on table public.organization_stripe_accounts is
  'One Stripe Connect account per canonical Organization workspace. Trusted server processes own all writes.';

create table if not exists public.organization_transfers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  campaign_id uuid references public.campaigns(id) on delete restrict,
  stripe_account_id text not null,
  stripe_transfer_id text,
  amount_cents integer not null,
  currency text not null default 'usd',
  status text not null default 'pending',
  source_type text not null default 'campaign_close',
  idempotency_key text not null,
  failure_code text,
  failure_message text,
  initiated_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_transfers_amount_positive
    check (amount_cents > 0),
  constraint organization_transfers_currency_format
    check (currency = lower(currency) and char_length(currency) = 3),
  constraint organization_transfers_status_valid
    check (status in ('pending', 'submitted', 'completed', 'failed', 'reversed')),
  constraint organization_transfers_source_type_valid
    check (source_type in ('campaign_close', 'manual_adjustment', 'correction'))
);

create unique index if not exists organization_transfers_idempotency_unique_idx
  on public.organization_transfers (idempotency_key);

create unique index if not exists organization_transfers_stripe_transfer_unique_idx
  on public.organization_transfers (stripe_transfer_id)
  where stripe_transfer_id is not null;

create index if not exists organization_transfers_org_created_idx
  on public.organization_transfers (organization_id, created_at desc);

create index if not exists organization_transfers_campaign_created_idx
  on public.organization_transfers (campaign_id, created_at desc)
  where campaign_id is not null;

alter table public.organization_transfers enable row level security;
revoke all on table public.organization_transfers from public, anon, authenticated;
grant select, insert, update on table public.organization_transfers to service_role;

comment on table public.organization_transfers is
  'Platform-to-Connect-account transfer lifecycle. This is intentionally separate from bank payout status.';

create table if not exists public.organization_payout_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  stripe_account_id text not null,
  stripe_payout_id text not null,
  amount_cents integer not null,
  currency text not null,
  status text not null,
  arrival_date date,
  failure_code text,
  failure_message text,
  livemode boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_payout_events_amount_nonnegative
    check (amount_cents >= 0),
  constraint organization_payout_events_currency_format
    check (currency = lower(currency) and char_length(currency) = 3)
);

create unique index if not exists organization_payout_events_stripe_payout_unique_idx
  on public.organization_payout_events (stripe_payout_id);

create index if not exists organization_payout_events_org_created_idx
  on public.organization_payout_events (organization_id, created_at desc);

alter table public.organization_payout_events enable row level security;
revoke all on table public.organization_payout_events from public, anon, authenticated;
grant select, insert, update on table public.organization_payout_events to service_role;

comment on table public.organization_payout_events is
  'Connected-account bank payout events, tracked separately from RaiseHub transfer records.';
