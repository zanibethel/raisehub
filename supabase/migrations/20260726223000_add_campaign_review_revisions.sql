-- Track the exact campaign content revision that RaiseHub approved.
-- Material edits automatically reopen review and are recorded in the audit log.

alter table public.campaigns
  add column if not exists content_revision integer not null default 1,
  add column if not exists approved_revision integer,
  add column if not exists review_invalidated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'campaigns_content_revision_positive'
      and conrelid = 'public.campaigns'::regclass
  ) then
    alter table public.campaigns
      add constraint campaigns_content_revision_positive
      check (content_revision > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'campaigns_approved_revision_valid'
      and conrelid = 'public.campaigns'::regclass
  ) then
    alter table public.campaigns
      add constraint campaigns_approved_revision_valid
      check (approved_revision is null or approved_revision > 0);
  end if;
end
$$;

-- Existing approved campaigns were approved at their current content revision.
update public.campaigns
set approved_revision = content_revision
where review_status = 'approved'
  and approved_revision is null;

create or replace function public.prepare_campaign_review_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  material_content_changed boolean;
begin
  material_content_changed :=
    new.name is distinct from old.name
    or new.description is distinct from old.description
    or new.goal_amount is distinct from old.goal_amount
    or new.starts_at is distinct from old.starts_at
    or new.ends_at is distinct from old.ends_at;

  if material_content_changed then
    new.content_revision := old.content_revision + 1;

    if old.review_status = 'approved' then
      new.review_status := 'not_submitted';
      new.approved_revision := null;
      new.review_invalidated_at := now();
      new.review_submitted_at := null;
      new.reviewed_at := null;
      new.reviewed_by := null;
      new.review_notes := null;
    end if;
  end if;

  -- Every approval is tied to the exact content revision being reviewed.
  if new.review_status = 'approved'
     and old.review_status is distinct from 'approved' then
    new.approved_revision := new.content_revision;
    new.review_invalidated_at := null;
  elsif old.review_status = 'approved'
        and new.review_status is distinct from 'approved' then
    new.approved_revision := null;
  end if;

  -- Defense in depth: no write path may publish stale or unapproved content.
  if new.status = 'active'
     and old.status is distinct from 'active'
     and (
       new.review_status is distinct from 'approved'
       or new.approved_revision is distinct from new.content_revision
     ) then
    raise exception 'Campaign approval is missing or no longer matches the current content revision.';
  end if;

  return new;
end
$$;

drop trigger if exists prepare_campaign_review_revision on public.campaigns;
create trigger prepare_campaign_review_revision
before update on public.campaigns
for each row
execute function public.prepare_campaign_review_revision();

create or replace function public.record_campaign_review_reopened()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_organization_id uuid;
begin
  if old.review_status = 'approved'
     and new.review_status = 'not_submitted'
     and new.review_invalidated_at is not null
     and new.content_revision is distinct from old.content_revision then
    resolved_organization_id := new.canonical_organization_id;

    if resolved_organization_id is null then
      select organization.id
      into resolved_organization_id
      from public.organizations as organization
      where organization.legacy_profile_id = new.organization_id
      limit 1;
    end if;

    insert into public.campaign_review_events (
      campaign_id,
      organization_id,
      decision_source,
      decision,
      previous_review_status,
      resulting_review_status,
      risk_level,
      risk_flags,
      check_results,
      reason,
      reviewed_by
    ) values (
      new.id,
      resolved_organization_id,
      'system',
      'reopened',
      old.review_status,
      new.review_status,
      'unknown',
      '[]'::jsonb,
      jsonb_build_object(
        'material_edit', true,
        'previous_content_revision', old.content_revision,
        'content_revision', new.content_revision,
        'previous_approved_revision', old.approved_revision
      ),
      'Campaign details changed after approval. Review was reopened automatically.',
      null
    );
  end if;

  return new;
end
$$;

drop trigger if exists record_campaign_review_reopened on public.campaigns;
create trigger record_campaign_review_reopened
after update on public.campaigns
for each row
execute function public.record_campaign_review_reopened();

comment on column public.campaigns.content_revision is
  'Monotonically increasing revision for material campaign content.';
comment on column public.campaigns.approved_revision is
  'Content revision most recently approved by automation or a RaiseHub reviewer.';
comment on column public.campaigns.review_invalidated_at is
  'Time an approved campaign was reopened because material content changed.';
