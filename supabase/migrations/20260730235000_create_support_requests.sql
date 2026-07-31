create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid null references auth.users(id) on delete set null,
  requester_name text not null,
  requester_email text not null,
  topic text not null,
  message text not null,
  source_page text null,
  environment text not null default 'production' check (environment in ('production', 'demo')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to uuid null references auth.users(id) on delete set null,
  internal_notes text null,
  customer_reply text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_requests_status_created_at_idx
  on public.support_requests (status, created_at desc);

create index if not exists support_requests_requester_user_id_idx
  on public.support_requests (requester_user_id, created_at desc);

alter table public.support_requests enable row level security;

create policy "Anyone can create a support request"
  on public.support_requests
  for insert
  to anon, authenticated
  with check (
    requester_user_id is null
    or requester_user_id = auth.uid()
  );

create policy "Requesters can read their own support requests"
  on public.support_requests
  for select
  to authenticated
  using (requester_user_id = auth.uid());

create policy "Owners can manage support requests"
  on public.support_requests
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'owner'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'owner'
    )
  );
