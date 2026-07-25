begin;

create table if not exists public.organization_payment_risk_overrides (
  organization_id uuid primary key references public.organizations(id) on delete restrict,
  standard_hold_days integer check (standard_hold_days is null or standard_hold_days between 0 and 90),
  first_payout_hold_days integer check (first_payout_hold_days is null or first_payout_hold_days between 0 and 90),
  reserve_percent_bps integer check (reserve_percent_bps is null or reserve_percent_bps between 0 and 10000),
  reserve_days integer check (reserve_days is null or reserve_days between 0 and 365),
  minimum_loss_tolerance_cents integer check (minimum_loss_tolerance_cents is null or minimum_loss_tolerance_cents >= 0),
  lifetime_payout_tolerance_bps integer check (lifetime_payout_tolerance_bps is null or lifetime_payout_tolerance_bps between 0 and 10000),
  payouts_paused boolean not null default false,
  manual_payout_approval_required boolean not null default false,
  reason text not null check (length(btrim(reason)) between 8 and 500),
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organization_payment_risk_overrides is
  'Nullable organization-specific payment-risk overrides. Global platform policy remains authoritative for null values.';

create table if not exists public.payment_risk_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  action_type text not null,
  previous_value jsonb,
  new_value jsonb,
  reason text not null check (length(btrim(reason)) between 8 and 500),
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  related_resource_type text,
  related_resource_id uuid,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

comment on table public.payment_risk_audit_events is
  'Immutable Owner audit history for payment-risk policy, payout controls, and signed financial adjustments.';

create or replace function public.prevent_payment_risk_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'payment risk audit events are immutable';
end;
$$;

drop trigger if exists payment_risk_audit_events_immutable_update on public.payment_risk_audit_events;
create trigger payment_risk_audit_events_immutable_update
before update on public.payment_risk_audit_events
for each row execute function public.prevent_payment_risk_audit_mutation();

drop trigger if exists payment_risk_audit_events_immutable_delete on public.payment_risk_audit_events;
create trigger payment_risk_audit_events_immutable_delete
before delete on public.payment_risk_audit_events
for each row execute function public.prevent_payment_risk_audit_mutation();

alter table public.organization_payment_risk_overrides enable row level security;
alter table public.payment_risk_audit_events enable row level security;

revoke all on public.organization_payment_risk_overrides from anon, authenticated;
revoke all on public.payment_risk_audit_events from anon, authenticated;

grant all on public.organization_payment_risk_overrides to service_role;
grant select, insert on public.payment_risk_audit_events to service_role;

create or replace function public.effective_organization_payment_risk_policy(p_organization_id uuid)
returns table (
  organization_id uuid,
  standard_hold_days integer,
  first_payout_hold_days integer,
  reserve_percent_bps integer,
  reserve_days integer,
  minimum_loss_tolerance_cents integer,
  lifetime_payout_tolerance_bps integer,
  pattern_count_threshold integer,
  pattern_rate_threshold_bps integer,
  payouts_paused boolean,
  manual_payout_approval_required boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p_organization_id,
    coalesce(o.standard_hold_days, p.standard_hold_days),
    coalesce(o.first_payout_hold_days, p.first_payout_hold_days),
    coalesce(o.reserve_percent_bps, p.reserve_percent_bps),
    coalesce(o.reserve_days, p.reserve_days),
    coalesce(o.minimum_loss_tolerance_cents, p.minimum_loss_tolerance_cents),
    coalesce(o.lifetime_payout_tolerance_bps, p.lifetime_payout_tolerance_bps),
    p.pattern_count_threshold,
    p.pattern_rate_threshold_bps,
    coalesce(o.payouts_paused, false),
    coalesce(o.manual_payout_approval_required, false)
  from public.platform_payment_risk_policy p
  left join public.organization_payment_risk_overrides o
    on o.organization_id = p_organization_id
  where p.singleton = true;
$$;

revoke all on function public.effective_organization_payment_risk_policy(uuid) from public, anon, authenticated;
grant execute on function public.effective_organization_payment_risk_policy(uuid) to service_role;

create or replace view public.owner_financial_health_summary
with (security_invoker = false)
as
with ledger as (
  select
    coalesce(sum(case when amount_cents > 0 and available_on > now() then amount_cents else 0 end), 0)::bigint as held_cents,
    coalesce(sum(case when entry_type = 'reserve_hold' then abs(amount_cents) else 0 end), 0)::bigint -
      coalesce(sum(case when entry_type = 'reserve_release' then abs(amount_cents) else 0 end), 0)::bigint as reserve_cents,
    coalesce(sum(case when amount_cents > 0 and (available_on is null or available_on <= now()) then amount_cents else 0 end), 0)::bigint as eligible_cents,
    coalesce(sum(case when entry_type = 'refund' then abs(amount_cents) else 0 end), 0)::bigint as refund_cents,
    coalesce(sum(case when entry_type = 'platform_loss' then abs(amount_cents) else 0 end), 0)::bigint as platform_loss_cents,
    coalesce(sum(case when entry_type = 'reserve_release' and available_on > now() and available_on <= now() + interval '30 days' then abs(amount_cents) else 0 end), 0)::bigint as upcoming_reserve_release_cents
  from public.organization_earnings_ledger
), disputes as (
  select
    count(*) filter (where dispute_status is not null and dispute_status not in ('won', 'lost'))::integer as open_dispute_count,
    coalesce(sum(case when dispute_status is not null and dispute_status not in ('won', 'lost') then greatest(organization_earnings * 100, 0)::bigint else 0 end), 0)::bigint as open_dispute_cents,
    coalesce(sum(case when dispute_status = 'lost' then greatest(organization_earnings * 100, 0)::bigint else 0 end), 0)::bigint as lost_dispute_cents
  from public.campaign_purchases
), balances as (
  select count(*)::integer as negative_organization_count
  from (
    select organization_id
    from public.organization_earnings_ledger
    group by organization_id
    having sum(amount_cents) < 0
  ) x
), risk as (
  select count(*)::integer as threshold_organization_count
  from (
    select organization_workspace_id
    from public.campaign_purchases
    where organization_workspace_id is not null
    group by organization_workspace_id
    having count(*) filter (where refunded_amount_cents > 0 or dispute_status is not null) >=
      (select pattern_count_threshold from public.platform_payment_risk_policy where singleton = true)
      or
      (count(*) filter (where refunded_amount_cents > 0 or dispute_status is not null)::numeric / nullif(count(*), 0)) * 10000 >=
      (select pattern_rate_threshold_bps from public.platform_payment_risk_policy where singleton = true)
  ) x
), review as (
  select count(*)::integer as manual_review_count
  from public.organization_payment_risk_overrides
  where payouts_paused or manual_payout_approval_required
)
select
  ledger.held_cents,
  greatest(ledger.reserve_cents, 0) as reserve_cents,
  ledger.eligible_cents,
  ledger.refund_cents,
  disputes.open_dispute_count,
  disputes.open_dispute_cents,
  disputes.lost_dispute_cents,
  ledger.platform_loss_cents,
  balances.negative_organization_count,
  risk.threshold_organization_count,
  ledger.upcoming_reserve_release_cents,
  review.manual_review_count
from ledger, disputes, balances, risk, review;

revoke all on public.owner_financial_health_summary from public, anon, authenticated;
grant select on public.owner_financial_health_summary to service_role;

commit;