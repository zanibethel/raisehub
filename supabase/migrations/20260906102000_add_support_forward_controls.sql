alter table public.support_email_routes
  add column if not exists forward_enabled boolean not null default false;

comment on column public.support_email_routes.forward_enabled is
  'When true, inbound mail for this bucket is copied to the external addresses in forward_to. In-app ingestion remains independent.';
