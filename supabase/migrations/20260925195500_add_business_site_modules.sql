begin;

alter table public.business_sites
  add column if not exists enabled_modules jsonb not null default '["offers"]'::jsonb,
  add column if not exists menu_config jsonb not null default '{"categories":[]}'::jsonb,
  add column if not exists location_config jsonb not null default '{"stops":[]}'::jsonb,
  add column if not exists booking_config jsonb not null default '{"url":"","label":"Book appointment"}'::jsonb;

alter table public.business_sites
  drop constraint if exists business_sites_enabled_modules_is_array,
  add constraint business_sites_enabled_modules_is_array
    check (jsonb_typeof(enabled_modules) = 'array'),
  drop constraint if exists business_sites_menu_config_is_object,
  add constraint business_sites_menu_config_is_object
    check (jsonb_typeof(menu_config) = 'object'),
  drop constraint if exists business_sites_location_config_is_object,
  add constraint business_sites_location_config_is_object
    check (jsonb_typeof(location_config) = 'object'),
  drop constraint if exists business_sites_booking_config_is_object,
  add constraint business_sites_booking_config_is_object
    check (jsonb_typeof(booking_config) = 'object');

comment on column public.business_sites.enabled_modules is
  'Optional business app/site modules enabled by the business. Core profile sections remain controlled by section_order.';
comment on column public.business_sites.menu_config is
  'Display configuration for menu/catalog content. Transactional commerce data should use dedicated tables when added.';
comment on column public.business_sites.location_config is
  'Display configuration for roaming/mobile business stops and schedules.';
comment on column public.business_sites.booking_config is
  'Display configuration for external booking now; transactional internal scheduling should use dedicated appointment tables later.';

commit;
