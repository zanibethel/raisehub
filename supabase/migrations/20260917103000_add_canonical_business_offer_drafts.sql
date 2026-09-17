-- Canonical business workspaces need drafts owned by the business entity rather
-- than by auth.users. Keep business_offer_drafts intact for legacy accounts.

create table if not exists public.business_workspace_offer_drafts (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  selected_goal text,
  selected_suggestion_id text,
  draft jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_workspace_offer_drafts enable row level security;

create policy "Business managers can view workspace offer draft"
on public.business_workspace_offer_drafts
for select
to authenticated
using (
  exists (
    select 1
    from public.business_memberships bm
    join public.businesses b on b.id = bm.business_id
    where bm.business_id = business_workspace_offer_drafts.business_id
      and bm.user_id = (select auth.uid())
      and bm.status = 'active'
      and bm.membership_role in ('owner', 'manager')
      and b.status = 'active'
      and b.archived_at is null
  )
);

create policy "Business managers can insert workspace offer draft"
on public.business_workspace_offer_drafts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.business_memberships bm
    join public.businesses b on b.id = bm.business_id
    where bm.business_id = business_workspace_offer_drafts.business_id
      and bm.user_id = (select auth.uid())
      and bm.status = 'active'
      and bm.membership_role in ('owner', 'manager')
      and b.status = 'active'
      and b.archived_at is null
  )
);

create policy "Business managers can update workspace offer draft"
on public.business_workspace_offer_drafts
for update
to authenticated
using (
  exists (
    select 1
    from public.business_memberships bm
    join public.businesses b on b.id = bm.business_id
    where bm.business_id = business_workspace_offer_drafts.business_id
      and bm.user_id = (select auth.uid())
      and bm.status = 'active'
      and bm.membership_role in ('owner', 'manager')
      and b.status = 'active'
      and b.archived_at is null
  )
)
with check (
  exists (
    select 1
    from public.business_memberships bm
    join public.businesses b on b.id = bm.business_id
    where bm.business_id = business_workspace_offer_drafts.business_id
      and bm.user_id = (select auth.uid())
      and bm.status = 'active'
      and bm.membership_role in ('owner', 'manager')
      and b.status = 'active'
      and b.archived_at is null
  )
);

create policy "Business managers can delete workspace offer draft"
on public.business_workspace_offer_drafts
for delete
to authenticated
using (
  exists (
    select 1
    from public.business_memberships bm
    join public.businesses b on b.id = bm.business_id
    where bm.business_id = business_workspace_offer_drafts.business_id
      and bm.user_id = (select auth.uid())
      and bm.status = 'active'
      and bm.membership_role in ('owner', 'manager')
      and b.status = 'active'
      and b.archived_at is null
  )
);

comment on table public.business_workspace_offer_drafts is
  'One collaborative saved offer draft per canonical business workspace. Legacy user-owned drafts remain in business_offer_drafts.';
