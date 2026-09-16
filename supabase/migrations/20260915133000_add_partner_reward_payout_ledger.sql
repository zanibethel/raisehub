create table if not exists public.partner_reward_payouts (
  id uuid primary key default gen_random_uuid(),
  award_id uuid not null references public.partner_reward_quarter_awards(id) on delete restrict,
  reward_period_id uuid not null references public.partner_reward_periods(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  stripe_account_id text not null,
  stripe_transfer_id text,
  amount_cents bigint not null,
  currency text not null default 'usd',
  status text not null default 'pending',
  idempotency_key text not null,
  requested_by uuid references auth.users(id) on delete set null,
  failure_code text,
  failure_message text,
  submitted_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  reversed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_reward_payouts_amount_positive check (amount_cents > 0),
  constraint partner_reward_payouts_currency_format check (currency = lower(currency) and char_length(currency) = 3),
  constraint partner_reward_payouts_status_valid check (status in ('pending','submitted','paid','failed','reversed'))
);

create unique index if not exists partner_reward_payouts_award_unique_idx
  on public.partner_reward_payouts (award_id);

create unique index if not exists partner_reward_payouts_idempotency_unique_idx
  on public.partner_reward_payouts (idempotency_key);

create unique index if not exists partner_reward_payouts_stripe_transfer_unique_idx
  on public.partner_reward_payouts (stripe_transfer_id)
  where stripe_transfer_id is not null;

create index if not exists partner_reward_payouts_period_status_idx
  on public.partner_reward_payouts (reward_period_id, status);

create index if not exists partner_reward_payouts_business_created_idx
  on public.partner_reward_payouts (business_id, created_at desc);

alter table public.partner_reward_payouts enable row level security;
revoke all on table public.partner_reward_payouts from public, anon, authenticated;
grant select, insert, update on table public.partner_reward_payouts to service_role;

comment on table public.partner_reward_payouts is
  'Operational Stripe transfer ledger for immutable finalized Partner Rewards awards. One payout record per award prevents duplicate disbursement.';
