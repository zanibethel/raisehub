alter table public.support_email_routes
  drop constraint if exists support_email_routes_bucket_check;

alter table public.support_email_routes
  add constraint support_email_routes_bucket_format_check
  check (bucket ~ '^[a-z][a-z0-9_]{1,39}$');

create unique index if not exists support_email_routes_bucket_uidx
  on public.support_email_routes (bucket);

comment on column public.support_email_routes.bucket is
  'Owner-managed routing key. Custom routes may create new buckets; each bucket maps to one RaiseHub sender address.';
