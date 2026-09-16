create table if not exists public.partner_reward_periods (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'closing', 'finalized')),
  rule_version text not null,
  total_eligible_points numeric(18, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (total_eligible_points is null or total_eligible_points >= 0)
);

create unique index if not exists partner_reward_periods_open_unique
  on public.partner_reward_periods ((status)) where status = 'open';

create table if not exists public.offer_reward_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  reward_period_id uuid not null references public.partner_reward_periods(id) on delete restrict,
  score integer not null check (score between 0 and 100),
  score_band text not null check (score_band in ('poor', 'developing', 'recommended', 'high_value', 'exceptional')),
  daily_weight numeric(6, 3) not null check (daily_weight >= 0),
  scoring_version text not null,
  input_snapshot jsonb not null default '{}'::jsonb,
  effective_from timestamptz not null,
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to > effective_from)
);

create index if not exists offer_reward_score_snapshots_offer_period_idx
  on public.offer_reward_score_snapshots (offer_id, reward_period_id, effective_from desc);

create index if not exists offer_reward_score_snapshots_business_period_idx
  on public.offer_reward_score_snapshots (business_id, reward_period_id, effective_from desc);

create table if not exists public.partner_point_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  reward_period_id uuid not null references public.partner_reward_periods(id) on delete restrict,
  offer_id uuid references public.offers(id) on delete restrict,
  event_type text not null,
  points numeric(14, 4) not null check (points <> 0),
  eligibility_status text not null default 'pending' check (eligibility_status in ('pending', 'eligible', 'ineligible', 'reversed')),
  source_type text,
  source_id uuid,
  idempotency_key text not null unique,
  rule_version text not null,
  reversal_of_event_id uuid references public.partner_point_events(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists partner_point_events_business_period_idx
  on public.partner_point_events (business_id, reward_period_id, created_at desc);

create index if not exists partner_point_events_period_eligibility_idx
  on public.partner_point_events (reward_period_id, eligibility_status);

create table if not exists public.partner_reward_checkpoints (
  business_id uuid not null references public.businesses(id) on delete restrict,
  reward_period_id uuid not null references public.partner_reward_periods(id) on delete restrict,
  last_reconciled_at timestamptz,
  last_presented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, reward_period_id)
);

insert into public.partner_reward_periods (label, starts_at, ends_at, status, rule_version)
values ('2026 Q3', '2026-07-01 00:00:00+00', '2026-10-01 00:00:00+00', 'open', 'partner_rewards_v1')
on conflict (label) do nothing;
