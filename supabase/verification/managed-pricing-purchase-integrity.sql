-- =============================================================================
-- Managed pricing purchase integrity verification
-- =============================================================================
-- Purpose:
--   Read-only verification for persisted managed-pricing purchase snapshots,
--   entitlement creation, and Production/Demo separation.
--
-- Safety:
--   This script does not insert, update, delete, alter, or migrate data.
--
-- Expected result:
--   The final query should return zero rows.
--
-- Scope:
--   Paid purchases created after pricing snapshots were introduced are identified
--   by pricing_resolved_at being non-null. Older historical purchases without
--   snapshots are intentionally excluded from snapshot-specific checks.
-- =============================================================================

with snapshot_purchases as (
  select
    id,
    amount_paid,
    platform_fee,
    organization_earnings,
    donation_amount,
    is_demo,
    demo_group,
    pricing_rule_id,
    pricing_scope,
    pass_price_charged,
    platform_fee_percent,
    organization_pass_earnings,
    pricing_resolved_at
  from public.campaign_purchases
  where pricing_resolved_at is not null
),
snapshot_entitlements as (
  select
    id,
    purchase_id,
    is_demo,
    demo_group,
    entitlement_type
  from public.customer_entitlements
  where purchase_id is not null
),
violations as (
  select
    'snapshot_missing_required_field'::text as check_name,
    purchase.id::text as record_id,
    jsonb_build_object(
      'pricing_scope', purchase.pricing_scope,
      'pass_price_charged', purchase.pass_price_charged,
      'platform_fee_percent', purchase.platform_fee_percent,
      'organization_pass_earnings',
        purchase.organization_pass_earnings,
      'pricing_resolved_at', purchase.pricing_resolved_at
    ) as details
  from snapshot_purchases as purchase
  where purchase.pricing_scope is null
    or purchase.pass_price_charged is null
    or purchase.pass_price_charged <= 0
    or purchase.platform_fee_percent is null
    or purchase.platform_fee_percent < 0
    or purchase.platform_fee_percent > 100
    or purchase.organization_pass_earnings is null
    or purchase.organization_pass_earnings < 0

  union all

  select
    'snapshot_amount_does_not_equal_pass_plus_donation',
    purchase.id::text,
    jsonb_build_object(
      'amount_paid', purchase.amount_paid,
      'pass_price_charged', purchase.pass_price_charged,
      'donation_amount', purchase.donation_amount
    )
  from snapshot_purchases as purchase
  where round(
    coalesce(purchase.pass_price_charged, 0)
      + coalesce(purchase.donation_amount, 0),
    2
  ) <> round(coalesce(purchase.amount_paid, 0), 2)

  union all

  select
    'snapshot_fee_does_not_match_percentage',
    purchase.id::text,
    jsonb_build_object(
      'platform_fee', purchase.platform_fee,
      'pass_price_charged', purchase.pass_price_charged,
      'platform_fee_percent', purchase.platform_fee_percent
    )
  from snapshot_purchases as purchase
  where round(
    coalesce(purchase.pass_price_charged, 0)
      * (
        coalesce(purchase.platform_fee_percent, 0)
        / 100
      ),
    2
  ) <> round(coalesce(purchase.platform_fee, 0), 2)

  union all

  select
    'snapshot_pass_split_does_not_equal_pass_price',
    purchase.id::text,
    jsonb_build_object(
      'platform_fee', purchase.platform_fee,
      'organization_pass_earnings',
        purchase.organization_pass_earnings,
      'pass_price_charged', purchase.pass_price_charged
    )
  from snapshot_purchases as purchase
  where round(
    coalesce(purchase.platform_fee, 0)
      + coalesce(
        purchase.organization_pass_earnings,
        0
      ),
    2
  ) <> round(
    coalesce(purchase.pass_price_charged, 0),
    2
  )

  union all

  select
    'snapshot_organization_total_is_incorrect',
    purchase.id::text,
    jsonb_build_object(
      'organization_earnings',
        purchase.organization_earnings,
      'organization_pass_earnings',
        purchase.organization_pass_earnings,
      'donation_amount', purchase.donation_amount
    )
  from snapshot_purchases as purchase
  where round(
    coalesce(
      purchase.organization_pass_earnings,
      0
    ) + coalesce(purchase.donation_amount, 0),
    2
  ) <> round(
    coalesce(purchase.organization_earnings, 0),
    2
  )

  union all

  select
    'snapshot_total_split_is_incorrect',
    purchase.id::text,
    jsonb_build_object(
      'amount_paid', purchase.amount_paid,
      'platform_fee', purchase.platform_fee,
      'organization_earnings',
        purchase.organization_earnings
    )
  from snapshot_purchases as purchase
  where round(
    coalesce(purchase.platform_fee, 0)
      + coalesce(purchase.organization_earnings, 0),
    2
  ) <> round(coalesce(purchase.amount_paid, 0), 2)

  union all

  select
    'production_purchase_has_demo_group',
    purchase.id::text,
    jsonb_build_object(
      'is_demo', purchase.is_demo,
      'demo_group', purchase.demo_group
    )
  from snapshot_purchases as purchase
  where coalesce(purchase.is_demo, false) = false
    and purchase.demo_group is not null

  union all

  select
    'snapshot_purchase_missing_entitlement',
    purchase.id::text,
    jsonb_build_object(
      'pricing_scope', purchase.pricing_scope,
      'is_demo', purchase.is_demo,
      'demo_group', purchase.demo_group
    )
  from snapshot_purchases as purchase
  left join snapshot_entitlements as entitlement
    on entitlement.purchase_id = purchase.id
  where entitlement.id is null

  union all

  select
    'snapshot_entitlement_type_is_incorrect',
    entitlement.id::text,
    jsonb_build_object(
      'purchase_id', entitlement.purchase_id,
      'entitlement_type', entitlement.entitlement_type
    )
  from snapshot_entitlements as entitlement
  inner join snapshot_purchases as purchase
    on purchase.id = entitlement.purchase_id
  where entitlement.entitlement_type
    <> 'purchased_pass'

  union all

  select
    'purchase_entitlement_demo_flags_do_not_match',
    entitlement.id::text,
    jsonb_build_object(
      'purchase_id', purchase.id,
      'purchase_is_demo', purchase.is_demo,
      'entitlement_is_demo', entitlement.is_demo,
      'purchase_demo_group', purchase.demo_group,
      'entitlement_demo_group',
        entitlement.demo_group
    )
  from snapshot_entitlements as entitlement
  inner join snapshot_purchases as purchase
    on purchase.id = entitlement.purchase_id
  where coalesce(entitlement.is_demo, false)
      <> coalesce(purchase.is_demo, false)
    or coalesce(entitlement.demo_group, '')
      <> coalesce(purchase.demo_group, '')

  union all

  select
    'production_entitlement_has_demo_group',
    entitlement.id::text,
    jsonb_build_object(
      'purchase_id', entitlement.purchase_id,
      'is_demo', entitlement.is_demo,
      'demo_group', entitlement.demo_group
    )
  from snapshot_entitlements as entitlement
  inner join snapshot_purchases as purchase
    on purchase.id = entitlement.purchase_id
  where coalesce(entitlement.is_demo, false) = false
    and entitlement.demo_group is not null
)
select
  check_name,
  record_id,
  details
from violations
order by
  check_name,
  record_id;