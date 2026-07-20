-- =============================================================================
-- RaiseHub QA prelaunch readiness verification
-- =============================================================================
-- Purpose:
--   Read-only verification that the temporary qa_prelaunch_2026 accounts and
--   linked test records still match the expected prelaunch test matrix.
--
-- Safety:
--   This script does not insert, update, delete, alter, or migrate data.
--
-- Expected result:
--   The final query should return zero rows.
-- =============================================================================

with expected_users (
  email,
  expected_role,
  expected_is_demo,
  expected_demo_group,
  expected_onboarding_completed,
  expected_active_entitlements
) as (
  values
    (
      'qa.clean.customer@raisehubtesting.com',
      'customer',
      false,
      null::text,
      true,
      0
    ),
    (
      'qa.active.customer@raisehubtesting.com',
      'customer',
      false,
      null::text,
      true,
      1
    ),
    (
      'qa.incomplete.customer@raisehubtesting.com',
      'customer',
      false,
      null::text,
      false,
      0
    ),
    (
      'qa.demo.clean.customer@raisehubtesting.com',
      'customer',
      true,
      'qa_prelaunch_2026',
      true,
      0
    ),
    (
      'qa.demo.active.customer@raisehubtesting.com',
      'customer',
      true,
      'qa_prelaunch_2026',
      true,
      1
    ),
    (
      'qa.complete.business@raisehubtesting.com',
      'business',
      false,
      null::text,
      true,
      0
    ),
    (
      'qa.incomplete.business@raisehubtesting.com',
      'business',
      false,
      null::text,
      false,
      0
    ),
    (
      'qa.complete.organization@raisehubtesting.com',
      'organization',
      false,
      null::text,
      true,
      0
    ),
    (
      'qa.incomplete.organization@raisehubtesting.com',
      'organization',
      false,
      null::text,
      false,
      0
    ),
    (
      'qa.admin@raisehubtesting.com',
      'admin',
      false,
      null::text,
      true,
      0
    ),
    (
      'qa.owner@raisehubtesting.com',
      'owner',
      false,
      null::text,
      true,
      0
    )
),
actual_users as (
  select
    auth_user.id,
    auth_user.email,
    profile.role,
    profile.is_demo,
    profile.demo_group,
    profile.onboarding_completed,
    auth_user.email_confirmed_at,
    auth_user.raw_user_meta_data ->> 'qa_seed_batch'
      as qa_seed_batch,
    exists (
      select 1
      from auth.identities as identity
      where identity.user_id = auth_user.id
        and identity.provider = 'email'
    ) as has_email_identity,
    count(entitlement.id) filter (
      where entitlement.status = 'active'
        and entitlement.starts_at <= now()
        and (
          entitlement.expires_at is null
          or entitlement.expires_at > now()
        )
    ) as active_entitlements
  from auth.users as auth_user
  inner join public.profiles as profile
    on profile.id = auth_user.id
  left join public.customer_entitlements as entitlement
    on entitlement.user_id = auth_user.id
  where auth_user.email like 'qa.%@raisehubtesting.com'
     or auth_user.raw_user_meta_data ->> 'qa_seed_batch'
       = 'qa_prelaunch_2026'
  group by
    auth_user.id,
    auth_user.email,
    profile.role,
    profile.is_demo,
    profile.demo_group,
    profile.onboarding_completed,
    auth_user.email_confirmed_at,
    auth_user.raw_user_meta_data
),
violations as (
  select
    'expected_user_missing'::text as check_name,
    expected.email as record_id,
    jsonb_build_object(
      'expected_role', expected.expected_role
    ) as details
  from expected_users as expected
  left join actual_users as actual
    on actual.email = expected.email
  where actual.id is null

  union all

  select
    'unexpected_qa_user',
    actual.email,
    jsonb_build_object(
      'role', actual.role,
      'qa_seed_batch', actual.qa_seed_batch
    )
  from actual_users as actual
  left join expected_users as expected
    on expected.email = actual.email
  where expected.email is null

  union all

  select
    'user_role_mismatch',
    expected.email,
    jsonb_build_object(
      'expected', expected.expected_role,
      'actual', actual.role
    )
  from expected_users as expected
  inner join actual_users as actual
    on actual.email = expected.email
  where actual.role <> expected.expected_role

  union all

  select
    'user_demo_flag_mismatch',
    expected.email,
    jsonb_build_object(
      'expected', expected.expected_is_demo,
      'actual', actual.is_demo
    )
  from expected_users as expected
  inner join actual_users as actual
    on actual.email = expected.email
  where actual.is_demo <> expected.expected_is_demo

  union all

  select
    'user_demo_group_mismatch',
    expected.email,
    jsonb_build_object(
      'expected', expected.expected_demo_group,
      'actual', actual.demo_group
    )
  from expected_users as expected
  inner join actual_users as actual
    on actual.email = expected.email
  where coalesce(actual.demo_group, '')
    <> coalesce(expected.expected_demo_group, '')

  union all

  select
    'user_onboarding_state_mismatch',
    expected.email,
    jsonb_build_object(
      'expected', expected.expected_onboarding_completed,
      'actual', actual.onboarding_completed
    )
  from expected_users as expected
  inner join actual_users as actual
    on actual.email = expected.email
  where actual.onboarding_completed
    <> expected.expected_onboarding_completed

  union all

  select
    'user_active_entitlement_count_mismatch',
    expected.email,
    jsonb_build_object(
      'expected', expected.expected_active_entitlements,
      'actual', actual.active_entitlements
    )
  from expected_users as expected
  inner join actual_users as actual
    on actual.email = expected.email
  where actual.active_entitlements
    <> expected.expected_active_entitlements

  union all

  select
    'user_email_not_confirmed',
    actual.email,
    jsonb_build_object(
      'email_confirmed_at', actual.email_confirmed_at
    )
  from actual_users as actual
  where actual.email_confirmed_at is null

  union all

  select
    'user_email_identity_missing',
    actual.email,
    jsonb_build_object(
      'has_email_identity', actual.has_email_identity
    )
  from actual_users as actual
  where actual.has_email_identity = false

  union all

  select
    'user_seed_batch_missing',
    actual.email,
    jsonb_build_object(
      'qa_seed_batch', actual.qa_seed_batch
    )
  from actual_users as actual
  where actual.qa_seed_batch is distinct from 'qa_prelaunch_2026'

  union all

  select
    'complete_business_entity_missing',
    'qa.complete.business@raisehubtesting.com',
    '{}'::jsonb
  where not exists (
    select 1
    from public.businesses as business
    inner join actual_users as actual
      on actual.id = business.legacy_profile_id
    where actual.email
      = 'qa.complete.business@raisehubtesting.com'
  )

  union all

  select
    'complete_business_membership_missing',
    'qa.complete.business@raisehubtesting.com',
    '{}'::jsonb
  where not exists (
    select 1
    from public.business_memberships as membership
    inner join actual_users as actual
      on actual.id = membership.user_id
    where actual.email
      = 'qa.complete.business@raisehubtesting.com'
      and membership.status = 'active'
  )

  union all

  select
    'qa_offer_missing',
    'qa.complete.business@raisehubtesting.com',
    '{}'::jsonb
  where not exists (
    select 1
    from public.offers as offer
    inner join actual_users as actual
      on actual.id = offer.business_id
    where actual.email
      = 'qa.complete.business@raisehubtesting.com'
      and offer.is_active = true
      and offer.title like '[QA]%'
  )

  union all

  select
    'complete_organization_entity_missing',
    'qa.complete.organization@raisehubtesting.com',
    '{}'::jsonb
  where not exists (
    select 1
    from public.organizations as organization
    inner join actual_users as actual
      on actual.id = organization.legacy_profile_id
    where actual.email
      = 'qa.complete.organization@raisehubtesting.com'
  )

  union all

  select
    'complete_organization_membership_missing',
    'qa.complete.organization@raisehubtesting.com',
    '{}'::jsonb
  where not exists (
    select 1
    from public.organization_memberships as membership
    inner join actual_users as actual
      on actual.id = membership.user_id
    where actual.email
      = 'qa.complete.organization@raisehubtesting.com'
      and membership.status = 'active'
  )

  union all

  select
    'qa_campaign_missing',
    'qa.complete.organization@raisehubtesting.com',
    '{}'::jsonb
  where not exists (
    select 1
    from public.campaigns as campaign
    inner join actual_users as actual
      on actual.id = campaign.organization_id
    where actual.email
      = 'qa.complete.organization@raisehubtesting.com'
      and campaign.status = 'active'
      and campaign.name like '[QA]%'
  )

  union all

  select
    'qa_demo_group_missing',
    'qa_prelaunch_2026',
    '{}'::jsonb
  where not exists (
    select 1
    from public.demo_groups
    where group_key = 'qa_prelaunch_2026'
  )
)
select
  check_name,
  record_id,
  details
from violations
order by
  check_name,
  record_id;