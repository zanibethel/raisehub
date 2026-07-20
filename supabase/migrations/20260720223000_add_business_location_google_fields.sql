-- =============================================================================
-- Business location and Google Places foundation
-- =============================================================================
--
-- Adds optional location and Google business metadata to the canonical
-- businesses table.
--
-- Location sources:
--   manual           - entered or adjusted by the business
--   current_location - captured through browser geolocation
--   google_place     - imported from a selected Google Places result
--
-- All fields remain nullable so existing businesses continue working without
-- location or Google data.
-- =============================================================================

alter table public.businesses
  add column if not exists address text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_source text,
  add column if not exists location_updated_at timestamp with time zone,
  add column if not exists google_place_id text,
  add column if not exists google_business_name text,
  add column if not exists google_formatted_address text,
  add column if not exists google_phone text,
  add column if not exists google_website_url text,
  add column if not exists google_maps_url text,
  add column if not exists google_primary_category text,
  add column if not exists google_rating numeric(2, 1),
  add column if not exists google_review_count integer,
  add column if not exists google_details_synced_at timestamp with time zone;

-- =============================================================================
-- Coordinate and metadata validation
-- =============================================================================

alter table public.businesses
  add constraint businesses_location_source_check
  check (
    location_source is null
    or location_source in (
      'manual',
      'current_location',
      'google_place'
    )
  );

alter table public.businesses
  add constraint businesses_latitude_check
  check (
    latitude is null
    or (
      latitude >= -90
      and latitude <= 90
    )
  );

alter table public.businesses
  add constraint businesses_longitude_check
  check (
    longitude is null
    or (
      longitude >= -180
      and longitude <= 180
    )
  );

alter table public.businesses
  add constraint businesses_coordinate_pair_check
  check (
    (
      latitude is null
      and longitude is null
    )
    or (
      latitude is not null
      and longitude is not null
    )
  );

alter table public.businesses
  add constraint businesses_google_rating_check
  check (
    google_rating is null
    or (
      google_rating >= 0
      and google_rating <= 5
    )
  );

alter table public.businesses
  add constraint businesses_google_review_count_check
  check (
    google_review_count is null
    or google_review_count >= 0
  );

-- =============================================================================
-- Lookup indexes
-- =============================================================================

create index if not exists businesses_google_place_id_idx
  on public.businesses (google_place_id)
  where google_place_id is not null;

create index if not exists businesses_coordinates_idx
  on public.businesses (latitude, longitude)
  where latitude is not null
    and longitude is not null;

-- =============================================================================
-- Column documentation
-- =============================================================================

comment on column public.businesses.address is
  'Owner-controlled customer-facing business address.';

comment on column public.businesses.latitude is
  'Business latitude used for customer distance calculations.';

comment on column public.businesses.longitude is
  'Business longitude used for customer distance calculations.';

comment on column public.businesses.location_source is
  'How the current coordinates were established: manual, current_location, or google_place.';

comment on column public.businesses.location_updated_at is
  'Timestamp when the owner last confirmed or changed the business location.';

comment on column public.businesses.google_place_id is
  'Google Places identifier selected by the business owner.';

comment on column public.businesses.google_business_name is
  'Business name returned by the most recent Google Places details lookup.';

comment on column public.businesses.google_formatted_address is
  'Formatted address returned by the most recent Google Places details lookup.';

comment on column public.businesses.google_phone is
  'Phone number returned by the most recent Google Places details lookup.';

comment on column public.businesses.google_website_url is
  'Website returned by the most recent Google Places details lookup.';

comment on column public.businesses.google_maps_url is
  'Google Maps URL returned for the selected Google Place.';

comment on column public.businesses.google_primary_category is
  'Primary business category returned by Google Places.';

comment on column public.businesses.google_rating is
  'Google rating captured during the most recent approved details sync.';

comment on column public.businesses.google_review_count is
  'Google review count captured during the most recent approved details sync.';

comment on column public.businesses.google_details_synced_at is
  'Timestamp of the most recent approved Google Places details refresh.';