begin;

create table public.business_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  provider text not null default 'google',
  provider_account_email text,
  calendar_id text not null default 'primary',
  encrypted_access_token text,
  encrypted_refresh_token text,
  token_expires_at timestamptz,
  granted_scopes text[] not null default '{}',
  connection_status text not null default 'pending',
  last_sync_at timestamptz,
  last_error text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_calendar_connections_provider check (provider = 'google'),
  constraint business_calendar_connections_status check (connection_status in ('pending','connected','needs_attention','disconnected')),
  constraint business_calendar_connections_business_provider unique (business_id, provider)
);

create table public.business_appointment_calendar_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.business_appointments(id) on delete cascade,
  connection_id uuid not null references public.business_calendar_connections(id) on delete cascade,
  provider_event_id text,
  sync_status text not null default 'pending',
  last_error text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_appointment_calendar_events_status check (sync_status in ('pending','synced','failed','deleted')),
  constraint business_appointment_calendar_events_appointment_connection unique (appointment_id, connection_id)
);

create index business_calendar_connections_business_idx
  on public.business_calendar_connections (business_id, connection_status);

create index business_appointment_calendar_events_appointment_idx
  on public.business_appointment_calendar_events (appointment_id, sync_status);

alter table public.business_calendar_connections enable row level security;
alter table public.business_appointment_calendar_events enable row level security;

revoke all on table public.business_calendar_connections from anon, authenticated;
revoke all on table public.business_appointment_calendar_events from anon, authenticated;
grant all on table public.business_calendar_connections to service_role;
grant all on table public.business_appointment_calendar_events to service_role;

comment on table public.business_calendar_connections is
  'Server-only business calendar credentials and connection metadata. Provider tokens must be encrypted before storage.';
comment on table public.business_appointment_calendar_events is
  'Server-only mapping between RaiseHub appointments and provider calendar events.';

commit;
