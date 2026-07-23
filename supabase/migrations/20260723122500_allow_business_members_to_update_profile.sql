-- =============================================================================
-- Allow active business members to update customer-facing business profile fields
-- =============================================================================

revoke update on table public.businesses from authenticated;

grant update (
  name,
  phone,
  address,
  website_url,
  logo_url,
  latitude,
  longitude,
  location_source,
  location_updated_at,
  updated_at
) on table public.businesses to authenticated;

drop policy if exists businesses_update_for_active_members_or_owner
  on public.businesses;

create policy businesses_update_for_active_members_or_owner
  on public.businesses
  for update
  to authenticated
  using (
    public.is_owner()
    or exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = businesses.id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
    )
  )
  with check (
    public.is_owner()
    or exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = businesses.id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
    )
  );

comment on policy businesses_update_for_active_members_or_owner
  on public.businesses is
  'Allows active business members and platform owners to update approved public profile fields while RLS prevents cross-business updates.';
