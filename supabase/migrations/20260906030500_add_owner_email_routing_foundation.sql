alter table public.support_requests
  add column if not exists channel text not null default 'web',
  add column if not exists bucket text not null default 'support',
  add column if not exists inbound_to text,
  add column if not exists provider_message_id text,
  add column if not exists email_thread_id text,
  add column if not exists reply_from_email text;

create unique index if not exists support_requests_provider_message_id_uidx
  on public.support_requests (provider_message_id)
  where provider_message_id is not null;

create table if not exists public.support_email_routes (
  id uuid primary key default gen_random_uuid(),
  address text not null unique,
  label text not null,
  bucket text not null,
  display_name text not null default 'RaiseHub',
  forward_to text[] not null default '{}',
  is_active boolean not null default true,
  accepts_inbound boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_email_routes_bucket_check check (
    bucket in ('support','general','billing','partnerships','legal','notifications')
  )
);

alter table public.support_email_routes enable row level security;

drop policy if exists "Owners can manage support email routes" on public.support_email_routes;
create policy "Owners can manage support email routes"
  on public.support_email_routes
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'owner'
    )
  );

create table if not exists public.support_request_messages (
  id uuid primary key default gen_random_uuid(),
  support_request_id uuid not null references public.support_requests(id) on delete cascade,
  direction text not null,
  sender_email text,
  recipient_emails text[] not null default '{}',
  subject text,
  body_text text,
  body_html text,
  provider_message_id text,
  provider_in_reply_to text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint support_request_messages_direction_check check (
    direction in ('inbound','outbound','internal')
  )
);

create unique index if not exists support_request_messages_provider_message_id_uidx
  on public.support_request_messages (provider_message_id)
  where provider_message_id is not null;

alter table public.support_request_messages enable row level security;

drop policy if exists "Owners can manage support request messages" on public.support_request_messages;
create policy "Owners can manage support request messages"
  on public.support_request_messages
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'owner'
    )
  );

insert into public.support_email_routes (
  address,
  label,
  bucket,
  display_name,
  accepts_inbound
)
values
  ('support@raisehub.app', 'Support', 'support', 'RaiseHub Support', true),
  ('contact@raisehub.app', 'General', 'general', 'RaiseHub', true),
  ('billing@raisehub.app', 'Billing', 'billing', 'RaiseHub Billing', true),
  ('partners@raisehub.app', 'Partnerships', 'partnerships', 'RaiseHub Partnerships', true),
  ('legal@raisehub.app', 'Legal', 'legal', 'RaiseHub Legal', true),
  ('notifications@raisehub.app', 'Notifications', 'notifications', 'RaiseHub Notifications', false)
on conflict (address) do update
set label = excluded.label,
    bucket = excluded.bucket,
    display_name = excluded.display_name,
    accepts_inbound = excluded.accepts_inbound,
    updated_at = now();
