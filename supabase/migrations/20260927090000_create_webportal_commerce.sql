create table if not exists public.webportal_ad_orders (
  id uuid primary key default gen_random_uuid(),
  business_name text not null check (char_length(business_name) between 1 and 100),
  contact_email text not null check (char_length(contact_email) between 3 and 160),
  ad_text text not null check (char_length(ad_text) between 1 and 90),
  destination_url text not null check (char_length(destination_url) between 8 and 500),
  plan_code text not null check (plan_code in ('seven_day', 'month_once', 'month_recurring')),
  amount_cents integer not null check (amount_cents > 0),
  duration_days integer not null check (duration_days in (7, 30)),
  recurring boolean not null default false,
  status text not null default 'checkout_open'
    check (status in (
      'checkout_open',
      'checkout_failed',
      'checkout_expired',
      'paid_pending_review',
      'approved',
      'active',
      'rejected',
      'expired',
      'canceled'
    )),
  stripe_checkout_session_id text unique,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  stripe_subscription_id text,
  subscription_status text,
  purchased_at timestamptz,
  approved_at timestamptz,
  activated_at timestamptz,
  ends_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists webportal_ad_orders_status_idx
  on public.webportal_ad_orders (status, created_at desc);

create index if not exists webportal_ad_orders_subscription_idx
  on public.webportal_ad_orders (stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table public.webportal_ad_orders enable row level security;

comment on table public.webportal_ad_orders is
  'Server-managed WebPortal advertising checkout, review, and activation records.';

create table if not exists public.webportal_support_payments (
  id uuid primary key default gen_random_uuid(),
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  contact_email text,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd',
  payment_status text not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists webportal_support_payments_paid_idx
  on public.webportal_support_payments (paid_at desc)
  where paid_at is not null;

alter table public.webportal_support_payments enable row level security;

comment on table public.webportal_support_payments is
  'Server-managed voluntary support payments for WebPortal.';
