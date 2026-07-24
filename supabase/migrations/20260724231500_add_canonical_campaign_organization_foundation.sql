-- Phase 1: introduce a canonical organization reference for campaigns without
-- removing the legacy profile-backed organization_id column.
--
-- Existing campaign behavior remains intact. Rows with a confirmed
-- organizations.legacy_profile_id mapping are backfilled; unmapped legacy rows
-- intentionally remain null for manual resolution.

alter table public.campaigns
  add column if not exists canonical_organization_id uuid;

comment on column public.campaigns.canonical_organization_id is
  'Canonical organizations.id owner for phased migration away from the legacy profiles-backed organization_id column.';

update public.campaigns as campaign
set canonical_organization_id = organization.id
from public.organizations as organization
where campaign.canonical_organization_id is null
  and organization.legacy_profile_id = campaign.organization_id;

alter table public.campaigns
  drop constraint if exists campaigns_canonical_organization_id_fkey;

alter table public.campaigns
  add constraint campaigns_canonical_organization_id_fkey
  foreign key (canonical_organization_id)
  references public.organizations(id)
  on delete restrict
  not valid;

alter table public.campaigns
  validate constraint campaigns_canonical_organization_id_fkey;

create index if not exists campaigns_canonical_organization_id_idx
  on public.campaigns(canonical_organization_id);

-- Keep the existing legacy auth.uid() policy during the transition. This new
-- policy authorizes active organization admins and managers against the
-- canonical organization reference.
drop policy if exists "Organization members can manage canonical campaigns"
  on public.campaigns;

create policy "Organization members can manage canonical campaigns"
  on public.campaigns
  as permissive
  for all
  to authenticated
  using (
    canonical_organization_id is not null
    and exists (
      select 1
      from public.organization_memberships as membership
      where membership.organization_id = campaigns.canonical_organization_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and membership.membership_role in ('admin', 'manager')
    )
  )
  with check (
    canonical_organization_id is not null
    and exists (
      select 1
      from public.organization_memberships as membership
      where membership.organization_id = campaigns.canonical_organization_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and membership.membership_role in ('admin', 'manager')
    )
  );
