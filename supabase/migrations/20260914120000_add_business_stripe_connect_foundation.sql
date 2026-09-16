-- =============================================================================
-- Business Stripe Connect foundation
-- =============================================================================

create table if not exists public.business_stripe_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
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
  constraint business_stripe_accounts_onboarding_status_valid
    check (onboarding_status in (
      'not_started',
      'in_progress',
      'restricted',
      'enabled',
      'disabled'
    )),
  constraint business_stripe_accounts_currency_format
    check (default_currency is null or (
      default_currency = lower(default_currency)
      and char_length(default_currency) = 3
    ))
);

create unique index if not exists business_stripe_accounts_business_unique_idx
  on public.business_stripe_accounts (business_id);

create unique index if not exists business_stripe_accounts_stripe_account_unique_idx
  on public.business_stripe_accounts (stripe_account_id);

create index if not exists business_stripe_accounts_status_idx
  on public.business_stripe_accounts (onboarding_status, payouts_enabled);

alter table public.business_stripe_accounts enable row level security;
revoke all on table public.business_stripe_accounts from public, anon, authenticated;
grant select, insert, update on table public.business_stripe_accounts to service_role;

comment on table public.business_stripe_accounts is
  'One Stripe Connect account per canonical Business workspace. Trusted server processes own all writes. Partner Rewards can accrue without this account; cash payout readiness requires it.';
