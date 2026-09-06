create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_enabled boolean not null default true,
  business_updates boolean not null default true,
  offer_expiry boolean not null default true,
  campaign_launch boolean not null default true,
  redemption_digest boolean not null default true,
  weekly_digest boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "Users can view own notification preferences" on public.notification_preferences;
create policy "Users can view own notification preferences"
on public.notification_preferences for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own notification preferences" on public.notification_preferences;
create policy "Users can insert own notification preferences"
on public.notification_preferences for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own notification preferences" on public.notification_preferences;
create policy "Users can update own notification preferences"
on public.notification_preferences for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('email')),
  status text not null default 'pending' check (status in ('pending','sent','skipped','failed')),
  provider text,
  provider_message_id text,
  error_message text,
  attempted_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_id, channel)
);

create index if not exists notification_deliveries_user_created_idx
  on public.notification_deliveries(user_id, created_at desc);
create index if not exists notification_deliveries_status_idx
  on public.notification_deliveries(status, created_at);

alter table public.notification_deliveries enable row level security;

drop policy if exists "Users can view own notification deliveries" on public.notification_deliveries;
create policy "Users can view own notification deliveries"
on public.notification_deliveries for select
to authenticated
using ((select auth.uid()) = user_id);

comment on table public.notification_preferences is 'Per-user delivery preferences for RaiseHub notifications. In-app notifications remain available independently of email delivery.';
comment on table public.notification_deliveries is 'Auditable outbound delivery attempts linked to in-app notifications.';
