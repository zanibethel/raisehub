alter table public.offers
  add column if not exists redemption_channel text not null default 'in_person',
  add column if not exists online_store_url text,
  add column if not exists discount_code text,
  add column if not exists discount_url text,
  add column if not exists online_redemption_instructions text;

alter table public.offers
  drop constraint if exists offers_redemption_channel_check;

alter table public.offers
  add constraint offers_redemption_channel_check
  check (redemption_channel in ('in_person', 'online', 'both'));

alter table public.offers
  drop constraint if exists offers_online_destination_check;

alter table public.offers
  add constraint offers_online_destination_check
  check (
    redemption_channel = 'in_person'
    or nullif(btrim(coalesce(online_store_url, '')), '') is not null
    or nullif(btrim(coalesce(discount_url, '')), '') is not null
  );

comment on column public.offers.redemption_channel is
  'Where the offer can be used: in_person, online, or both.';
comment on column public.offers.online_store_url is
  'Business-provided online storefront URL for an online-capable offer.';
comment on column public.offers.discount_code is
  'Optional business-provided coupon code shown only to eligible customers.';
comment on column public.offers.discount_url is
  'Optional business-provided URL that applies or carries the online discount.';
comment on column public.offers.online_redemption_instructions is
  'Optional customer-facing instructions for using an online offer.';
