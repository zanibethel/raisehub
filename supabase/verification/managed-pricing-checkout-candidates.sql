-- =============================================================================
-- Managed pricing fresh checkout candidate discovery
-- =============================================================================
-- Purpose:
--   Read-only discovery of campaigns, organizations, pricing rules, and customer
--   accounts that may be used with the fresh checkout verification runbook.
--
-- Safety:
--   This script does not insert, update, delete, alter, or migrate data.
--
-- Notes:
--   - Candidate results still require human review before use.
--   - A "clean" customer has no currently active entitlement.
--   - A donation-only customer has a currently active entitlement.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Sellable campaign and organization candidates
-- -----------------------------------------------------------------------------

with campaign_candidates as (
  select
    campaign.id as campaign_id,
    campaign.name as campaign_name,
    campaign.status as campaign_status,
    campaign.starts_at,
    campaign.ends_at,
    campaign.is_demo as campaign_is_demo,
    campaign.demo_group as campaign_demo_group,
    profile.id as organization_profile_id,
    coalesce(
      profile.display_name,
      profile.full_name,
      profile.email
    ) as organization_profile_name,
    profile.is_demo as profile_is_demo,
    profile.demo_group as profile_demo_group,
    organization.id as organization_entity_id,
    organization.name as organization_entity_name,
    organization.town_name,
    organization.state_code,
    organization.is_demo as organization_is_demo,
    organization.demo_group as organization_demo_group
  from public.campaigns as campaign
  inner join public.profiles as profile
    on profile.id = campaign.organization_id
   and profile.role = 'organization'
  left join public.organizations as organization
    on organization.legacy_profile_id = profile.id
  where campaign.status = 'active'
    and (
      campaign.starts_at is null
      or campaign.starts_at <= current_date
    )
    and (
      campaign.ends_at is null
      or campaign.ends_at >= current_date
    )
)
select
  case
    when campaign_is_demo then 'demo'
    else 'production'
  end as environment,
  campaign_id,
  campaign_name,
  organization_profile_id,
  organization_profile_name,
  organization_entity_id,
  organization_entity_name,
  town_name,
  state_code,
  campaign_demo_group,
  profile_demo_group,
  organization_demo_group,
  (
    campaign_is_demo = profile_is_demo
    and (
      organization_entity_id is null
      or campaign_is_demo = organization_is_demo
    )
    and coalesce(campaign_demo_group, '')
      = coalesce(profile_demo_group, '')
    and (
      organization_entity_id is null
      or coalesce(campaign_demo_group, '')
        = coalesce(organization_demo_group, '')
    )
  ) as demo_metadata_matches
from campaign_candidates
order by
  environment,
  campaign_name;

-- -----------------------------------------------------------------------------
-- 2. Active pricing-rule candidates
-- -----------------------------------------------------------------------------

select
  case
    when pricing_rule.is_demo then 'demo'
    else 'production'
  end as environment,
  pricing_rule.id as pricing_rule_id,
  pricing_rule.scope_type,
  pricing_rule.campaign_id,
  pricing_rule.organization_id,
  pricing_rule.town_name,
  pricing_rule.state_code,
  pricing_rule.pass_price,
  pricing_rule.platform_fee_percent,
  pricing_rule.starts_at,
  pricing_rule.expires_at,
  pricing_rule.demo_group,
  pricing_rule.reason
from public.pricing_rules as pricing_rule
where pricing_rule.status = 'active'
  and pricing_rule.starts_at <= now()
  and (
    pricing_rule.expires_at is null
    or pricing_rule.expires_at > now()
  )
order by
  environment,
  pricing_rule.scope_type,
  pricing_rule.starts_at desc,
  pricing_rule.created_at desc;

-- -----------------------------------------------------------------------------
-- 3. Clean paid-pass customer candidates
-- -----------------------------------------------------------------------------

select
  case
    when profile.is_demo then 'demo'
    else 'production'
  end as environment,
  profile.id as customer_id,
  profile.email,
  coalesce(
    profile.display_name,
    profile.full_name,
    profile.email
  ) as customer_name,
  profile.demo_group,
  count(entitlement.id) filter (
    where entitlement.status = 'active'
      and entitlement.starts_at <= now()
      and (
        entitlement.expires_at is null
        or entitlement.expires_at > now()
      )
  ) as active_entitlement_count
from public.profiles as profile
left join public.customer_entitlements as entitlement
  on entitlement.user_id = profile.id
where profile.role = 'customer'
group by
  profile.id,
  profile.email,
  profile.display_name,
  profile.full_name,
  profile.is_demo,
  profile.demo_group
having count(entitlement.id) filter (
  where entitlement.status = 'active'
    and entitlement.starts_at <= now()
    and (
      entitlement.expires_at is null
      or entitlement.expires_at > now()
    )
) = 0
order by
  environment,
  customer_name;

-- -----------------------------------------------------------------------------
-- 4. Donation-only customer candidates
-- -----------------------------------------------------------------------------

select
  case
    when profile.is_demo then 'demo'
    else 'production'
  end as environment,
  profile.id as customer_id,
  profile.email,
  coalesce(
    profile.display_name,
    profile.full_name,
    profile.email
  ) as customer_name,
  profile.demo_group,
  entitlement.id as active_entitlement_id,
  entitlement.entitlement_type,
  entitlement.starts_at,
  entitlement.expires_at,
  entitlement.is_demo as entitlement_is_demo,
  entitlement.demo_group as entitlement_demo_group,
  (
    profile.is_demo = entitlement.is_demo
    and coalesce(profile.demo_group, '')
      = coalesce(entitlement.demo_group, '')
  ) as demo_metadata_matches
from public.profiles as profile
inner join public.customer_entitlements as entitlement
  on entitlement.user_id = profile.id
where profile.role = 'customer'
  and entitlement.status = 'active'
  and entitlement.starts_at <= now()
  and (
    entitlement.expires_at is null
    or entitlement.expires_at > now()
  )
order by
  environment,
  customer_name,
  entitlement.expires_at nulls last;