create table if not exists public.operational_job_health (
  job_name text primary key,
  last_started_at timestamptz,
  last_succeeded_at timestamptz,
  last_failed_at timestamptz,
  last_status text not null default 'unknown'
    check (last_status in ('unknown', 'running', 'succeeded', 'failed')),
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.operational_job_health enable row level security;
revoke all on table public.operational_job_health from anon, authenticated;
comment on table public.operational_job_health is 'Service-role-only health heartbeat for scheduled operational jobs.';
