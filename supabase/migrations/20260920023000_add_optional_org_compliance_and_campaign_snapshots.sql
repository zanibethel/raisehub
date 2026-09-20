-- Non-blocking organization compliance metadata and campaign close snapshots.
--
-- These fields are informational/reporting data. They are intentionally not
-- used as campaign creation or publishing gates. Stripe/payment readiness
-- continues to control financial actions independently.

alter table public.organizations
  add column if not exists compliance_profile jsonb not null default '{}'::jsonb;

alter table public.organizations
  drop constraint if exists organizations_compliance_profile_object;

alter table public.organizations
  add constraint organizations_compliance_profile_object
  check (jsonb_typeof(compliance_profile) = 'object');

comment on column public.organizations.compliance_profile is
  'Optional organization compliance/reporting metadata. Do not use as a campaign creation or promotion gate.';

alter table public.campaigns
  add column if not exists completed_at timestamptz,
  add column if not exists completion_snapshot jsonb;

alter table public.campaigns
  drop constraint if exists campaigns_completion_snapshot_object;

alter table public.campaigns
  add constraint campaigns_completion_snapshot_object
  check (completion_snapshot is null or jsonb_typeof(completion_snapshot) = 'object');

comment on column public.campaigns.completion_snapshot is
  'Historical organization/reporting snapshot captured when a campaign is marked completed.';

comment on column public.campaigns.completed_at is
  'Timestamp of the most recent transition to completed status.';
