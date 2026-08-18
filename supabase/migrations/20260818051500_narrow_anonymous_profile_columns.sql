-- Public offer and partner pages need a narrow subset of business/organization
-- presentation fields. Anonymous callers must not receive whole profile rows,
-- which also contain email and internal account state.

revoke all privileges on table public.profiles from anon;

grant select (
  id,
  role,
  business_name,
  display_name,
  logo_url,
  phone,
  address,
  website_url,
  google_maps_url,
  business_category,
  business_description,
  facebook_url,
  instagram_url,
  tiktok_url,
  is_demo,
  demo_group
) on table public.profiles to anon;

-- Keep the existing row-level public-partner rule. Column privileges above are
-- the second boundary: anon can only retrieve approved presentation fields
-- from rows that RLS already identifies as public partner profiles.
