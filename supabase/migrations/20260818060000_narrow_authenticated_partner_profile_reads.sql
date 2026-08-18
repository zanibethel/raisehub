-- Signed-in users should not receive entire business/organization profile rows.
-- Public partner presentation data is loaded server-side through an explicit,
-- safe-column repository. Direct profile-table access remains for a user's own
-- profile, Owners, and businesses viewing customers with actual redemptions.

alter policy "Anyone can view public partner profiles"
on public.profiles
to anon;

drop policy if exists "Authenticated users can view business profiles"
on public.profiles;

alter policy "Businesses can view customer profiles for redeemed offers"
on public.profiles
using (
  auth.uid() = id
  or exists (
    select 1
    from public.redemptions
    join public.offers on offers.id = redemptions.offer_id
    where redemptions.user_id = profiles.id
      and offers.business_id = auth.uid()
  )
);
