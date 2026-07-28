alter table public.businesses
  add column if not exists archive_reason text,
  add column if not exists archived_by uuid references public.profiles(id) on delete set null,
  add column if not exists restore_requested_at timestamptz,
  add column if not exists restore_requested_by uuid references public.profiles(id) on delete set null,
  add column if not exists lifecycle_note text;

alter table public.businesses drop constraint if exists businesses_status_check;
alter table public.businesses add constraint businesses_status_check
  check (
    status = any (
      array[
        'active'::text,
        'inactive'::text,
        'suspended'::text,
        'archived'::text,
        'restore_requested'::text
      ]
    )
  );

create index if not exists businesses_restore_requested_idx
  on public.businesses (restore_requested_at desc)
  where status = 'restore_requested';
