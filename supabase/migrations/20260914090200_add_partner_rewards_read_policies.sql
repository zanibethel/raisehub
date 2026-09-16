create policy "Authenticated users can read reward periods"
on public.partner_reward_periods
for select
to authenticated
using (true);

create policy "Business members can read own offer reward scores"
on public.offer_reward_score_snapshots
for select
to authenticated
using (
  exists (
    select 1
    from public.business_memberships bm
    where bm.business_id = offer_reward_score_snapshots.business_id
      and bm.user_id = (select auth.uid())
      and bm.status = 'active'
  )
);

create policy "Business members can read own partner point events"
on public.partner_point_events
for select
to authenticated
using (
  exists (
    select 1
    from public.business_memberships bm
    where bm.business_id = partner_point_events.business_id
      and bm.user_id = (select auth.uid())
      and bm.status = 'active'
  )
);

create policy "Business members can read own reward checkpoints"
on public.partner_reward_checkpoints
for select
to authenticated
using (
  exists (
    select 1
    from public.business_memberships bm
    where bm.business_id = partner_reward_checkpoints.business_id
      and bm.user_id = (select auth.uid())
      and bm.status = 'active'
  )
);
