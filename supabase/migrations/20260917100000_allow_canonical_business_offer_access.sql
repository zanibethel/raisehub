-- Allow canonical business workspaces to manage offers through business memberships
-- while preserving the legacy profile-id policies during the migration period.

create policy "Business members can view workspace offers"
on public.offers
for select
to authenticated
using (
  exists (
    select 1
    from public.business_memberships bm
    join public.businesses b on b.id = bm.business_id
    where bm.user_id = (select auth.uid())
      and bm.status = 'active'
      and b.status = 'active'
      and b.archived_at is null
      and b.id = public.resolve_offer_canonical_business_id(offers.business_id)
  )
);

create policy "Business managers can insert workspace offers"
on public.offers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.business_memberships bm
    join public.businesses b on b.id = bm.business_id
    where bm.user_id = (select auth.uid())
      and bm.status = 'active'
      and bm.membership_role in ('owner', 'manager')
      and b.status = 'active'
      and b.archived_at is null
      and b.id = public.resolve_offer_canonical_business_id(offers.business_id)
  )
);

create policy "Business managers can update workspace offers"
on public.offers
for update
to authenticated
using (
  exists (
    select 1
    from public.business_memberships bm
    join public.businesses b on b.id = bm.business_id
    where bm.user_id = (select auth.uid())
      and bm.status = 'active'
      and bm.membership_role in ('owner', 'manager')
      and b.status = 'active'
      and b.archived_at is null
      and b.id = public.resolve_offer_canonical_business_id(offers.business_id)
  )
)
with check (
  exists (
    select 1
    from public.business_memberships bm
    join public.businesses b on b.id = bm.business_id
    where bm.user_id = (select auth.uid())
      and bm.status = 'active'
      and bm.membership_role in ('owner', 'manager')
      and b.status = 'active'
      and b.archived_at is null
      and b.id = public.resolve_offer_canonical_business_id(offers.business_id)
  )
);

comment on policy "Business members can view workspace offers" on public.offers is
  'Active members may read offers belonging to their canonical business workspace, including legacy-linked offer rows.';
comment on policy "Business managers can insert workspace offers" on public.offers is
  'Active owner and manager memberships may create offers for their canonical business workspace.';
comment on policy "Business managers can update workspace offers" on public.offers is
  'Active owner and manager memberships may update offers belonging to their canonical business workspace.';
