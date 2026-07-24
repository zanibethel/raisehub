-- =============================================================================
-- Campaign review and publish controls
-- =============================================================================

alter table public.campaigns
  add column if not exists review_status text not null default 'not_submitted',
  add column if not exists review_notes text,
  add column if not exists review_submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists campaign_type text not null default 'organization',
  add column if not exists beneficiary_name text,
  add column if not exists beneficiary_relationship text,
  add column if not exists terms_accepted_at timestamptz;

alter table public.campaigns
  drop constraint if exists campaigns_review_status_valid;

alter table public.campaigns
  add constraint campaigns_review_status_valid
  check (review_status in (
    'not_submitted',
    'pending',
    'approved',
    'changes_requested',
    'rejected',
    'suspended'
  ));

alter table public.campaigns
  drop constraint if exists campaigns_campaign_type_valid;

alter table public.campaigns
  add constraint campaigns_campaign_type_valid
  check (campaign_type in ('organization', 'personal'));

create index if not exists campaigns_review_queue_idx
  on public.campaigns (review_status, created_at desc);

comment on column public.campaigns.review_status is
  'RaiseHub campaign review status. Stripe verification and RaiseHub review are separate publish requirements.';

comment on column public.campaigns.campaign_type is
  'Campaign ownership model. Personal campaigns remain feature-flagged until Stripe platform approval.';

-- Existing active campaigns predate this review workflow. Mark them approved so the
-- migration does not unexpectedly remove already-visible campaigns.
update public.campaigns
set
  review_status = 'approved',
  reviewed_at = coalesce(reviewed_at, now())
where status = 'active'
  and review_status = 'not_submitted';