begin;

create extension if not exists btree_gist with schema extensions;

create table if not exists public.business_booking_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes smallint not null default 60,
  price_label text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_booking_services_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint business_booking_services_duration check (duration_minutes between 15 and 480)
);

create index if not exists business_booking_services_business_active_idx
  on public.business_booking_services (business_id, is_active, sort_order);

create table if not exists public.business_booking_availability (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  weekday smallint not null,
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint business_booking_availability_weekday check (weekday between 0 and 6),
  constraint business_booking_availability_time_order check (start_time < end_time),
  constraint business_booking_availability_unique_window unique (business_id, weekday, start_time, end_time)
);

create index if not exists business_booking_availability_business_day_idx
  on public.business_booking_availability (business_id, weekday, is_active);

create table if not exists public.business_appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid references public.business_booking_services(id) on delete set null,
  service_name_snapshot text not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  customer_note text,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'pending',
  source text not null default 'raisehub',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  constraint business_appointments_time_order check (start_time < end_time),
  constraint business_appointments_status check (
    status in ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')
  ),
  constraint business_appointments_customer_name_length check (char_length(btrim(customer_name)) between 1 and 120),
  constraint business_appointments_customer_email_length check (char_length(btrim(customer_email)) between 3 and 254)
);

create index if not exists business_appointments_business_date_idx
  on public.business_appointments (business_id, appointment_date, start_time);

create index if not exists business_appointments_business_status_idx
  on public.business_appointments (business_id, status, appointment_date, start_time);

alter table public.business_appointments
  drop constraint if exists business_appointments_no_overlap;

alter table public.business_appointments
  add constraint business_appointments_no_overlap
  exclude using gist (
    business_id with =,
    tsrange(appointment_date + start_time, appointment_date + end_time, '[)') with &&
  )
  where (status in ('pending', 'confirmed'));

alter table public.business_booking_services enable row level security;
alter table public.business_booking_availability enable row level security;
alter table public.business_appointments enable row level security;

revoke all on table public.business_booking_services from anon, authenticated;
revoke all on table public.business_booking_availability from anon, authenticated;
revoke all on table public.business_appointments from anon, authenticated;

grant select, insert, update, delete on table public.business_booking_services to authenticated;
grant select, insert, update, delete on table public.business_booking_availability to authenticated;
grant select, update on table public.business_appointments to authenticated;

grant all on table public.business_booking_services to service_role;
grant all on table public.business_booking_availability to service_role;
grant all on table public.business_appointments to service_role;

drop policy if exists business_booking_services_member_manage on public.business_booking_services;
create policy business_booking_services_member_manage
  on public.business_booking_services
  for all
  to authenticated
  using (
    public.is_owner()
    or exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = business_booking_services.business_id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
        and bm.membership_role in ('owner', 'manager')
    )
  )
  with check (
    public.is_owner()
    or exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = business_booking_services.business_id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
        and bm.membership_role in ('owner', 'manager')
    )
  );

drop policy if exists business_booking_availability_member_manage on public.business_booking_availability;
create policy business_booking_availability_member_manage
  on public.business_booking_availability
  for all
  to authenticated
  using (
    public.is_owner()
    or exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = business_booking_availability.business_id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
        and bm.membership_role in ('owner', 'manager')
    )
  )
  with check (
    public.is_owner()
    or exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = business_booking_availability.business_id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
        and bm.membership_role in ('owner', 'manager')
    )
  );

drop policy if exists business_appointments_member_read on public.business_appointments;
create policy business_appointments_member_read
  on public.business_appointments
  for select
  to authenticated
  using (
    public.is_owner()
    or exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = business_appointments.business_id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
        and bm.membership_role in ('owner', 'manager')
    )
  );

drop policy if exists business_appointments_member_update on public.business_appointments;
create policy business_appointments_member_update
  on public.business_appointments
  for update
  to authenticated
  using (
    public.is_owner()
    or exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = business_appointments.business_id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
        and bm.membership_role in ('owner', 'manager')
    )
  )
  with check (
    public.is_owner()
    or exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = business_appointments.business_id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
        and bm.membership_role in ('owner', 'manager')
    )
  );

comment on table public.business_booking_services is
  'Bookable services configured by a RaiseHub business.';
comment on table public.business_booking_availability is
  'Recurring weekly booking windows for a RaiseHub business; weekday uses 0=Sunday through 6=Saturday.';
comment on table public.business_appointments is
  'Private customer appointment requests created through RaiseHub scheduling and visible only to authorized business members.';

commit;
