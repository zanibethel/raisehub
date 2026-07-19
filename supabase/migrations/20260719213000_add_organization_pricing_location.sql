-- Add canonical organization location fields used by managed pricing.
--
-- These fields allow campaign pricing to resolve through:
-- Campaign > Organization > Town > State > Platform > fallback.
--
-- They remain nullable so existing organizations continue working and
-- automatically fall through to broader pricing scopes until location
-- data is populated.

alter table public.organizations
  add column if not exists town_name text,
  add column if not exists state_code text;

comment on column public.organizations.town_name is
  'Canonical town or city used when resolving town-level managed pricing.';

comment on column public.organizations.state_code is
  'Two-letter uppercase US state code used when resolving state-level managed pricing.';

alter table public.organizations
  drop constraint if exists organizations_town_name_not_blank;

alter table public.organizations
  add constraint organizations_town_name_not_blank
  check (
    town_name is null
    or btrim(town_name) <> ''
  );

alter table public.organizations
  drop constraint if exists organizations_state_code_format;

alter table public.organizations
  add constraint organizations_state_code_format
  check (
    state_code is null
    or state_code ~ '^[A-Z]{2}$'
  );

create index if not exists organizations_pricing_location_idx
  on public.organizations (
    state_code,
    lower(town_name)
  )
  where state_code is not null;