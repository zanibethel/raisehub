alter table public.webportal_ad_orders
  add column if not exists logo_url text;

alter table public.webportal_ad_orders
  drop constraint if exists webportal_ad_orders_logo_url_length;

alter table public.webportal_ad_orders
  add constraint webportal_ad_orders_logo_url_length
  check (logo_url is null or char_length(logo_url) <= 1000);

comment on column public.webportal_ad_orders.logo_url is
  'Optional public business logo shown in the WebPortal TV ad rotation.';
