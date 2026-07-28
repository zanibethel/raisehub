create or replace view public.owner_financial_health_summary as
with production_organizations as (
  select o.id
  from public.organizations o
  left join public.profiles p on p.id = o.legacy_profile_id
  where coalesce(o.is_demo, false) = false
    and o.demo_group is null
    and coalesce(p.is_demo, false) = false
    and p.demo_group is null
),
production_ledger as (
  select l.*
  from public.organization_earnings_ledger l
  join production_organizations po on po.id = l.organization_id
),
production_purchases as (
  select cp.*
  from public.campaign_purchases cp
  join production_organizations po on po.id = cp.organization_workspace_id
  where coalesce(cp.is_demo, false) = false
    and cp.demo_group is null
),
ledger as (
  select
    coalesce(sum(case when amount_cents > 0 and available_on > now() then amount_cents else 0 end), 0::bigint) as held_cents,
    coalesce(sum(case when entry_type = 'reserve_hold' then abs(amount_cents) else 0 end), 0::bigint)
      - coalesce(sum(case when entry_type = 'reserve_release' then abs(amount_cents) else 0 end), 0::bigint) as reserve_cents,
    coalesce(sum(case when amount_cents > 0 and (available_on is null or available_on <= now()) then amount_cents else 0 end), 0::bigint) as eligible_cents,
    coalesce(sum(case when entry_type = 'refund' then abs(amount_cents) else 0 end), 0::bigint) as refund_cents,
    coalesce(sum(case when entry_type = 'platform_loss' then abs(amount_cents) else 0 end), 0::bigint) as platform_loss_cents,
    coalesce(sum(case when entry_type = 'reserve_release' and available_on > now() and available_on <= now() + interval '30 days' then abs(amount_cents) else 0 end), 0::bigint) as upcoming_reserve_release_cents
  from production_ledger
),
disputes as (
  select
    count(*) filter (where dispute_status is not null and dispute_status <> all(array['won','lost']))::integer as open_dispute_count,
    coalesce(sum(case when dispute_status is not null and dispute_status <> all(array['won','lost']) then greatest(organization_earnings * 100::numeric, 0::numeric)::bigint else 0::bigint end), 0::numeric)::bigint as open_dispute_cents,
    coalesce(sum(case when dispute_status = 'lost' then greatest(organization_earnings * 100::numeric, 0::numeric)::bigint else 0::bigint end), 0::numeric)::bigint as lost_dispute_cents
  from production_purchases
),
balances as (
  select count(*)::integer as negative_organization_count
  from (
    select organization_id
    from production_ledger
    group by organization_id
    having sum(amount_cents) < 0
  ) x
),
risk as (
  select count(*)::integer as threshold_organization_count
  from (
    select organization_workspace_id
    from production_purchases
    group by organization_workspace_id
    having count(*) filter (where refunded_amount_cents > 0 or dispute_status is not null) >= (
      select pattern_count_threshold from public.platform_payment_risk_policy where singleton = true
    )
    or (
      count(*) filter (where refunded_amount_cents > 0 or dispute_status is not null)::numeric
      / nullif(count(*), 0)::numeric * 10000::numeric
    ) >= (
      select pattern_rate_threshold_bps from public.platform_payment_risk_policy where singleton = true
    )::numeric
  ) x
),
review as (
  select count(*)::integer as manual_review_count
  from public.organization_payment_risk_overrides opro
  join production_organizations po on po.id = opro.organization_id
  where opro.payouts_paused or opro.manual_payout_approval_required
)
select
  ledger.held_cents,
  greatest(ledger.reserve_cents, 0::bigint) as reserve_cents,
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
