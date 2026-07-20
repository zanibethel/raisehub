-- =============================================================================
-- RaiseHub QA prelaunch cleanup
-- =============================================================================
-- Removes the temporary qa_prelaunch_2026 users and related records.
-- Review before running. This is destructive.
-- =============================================================================

begin;

create temporary table qa_users on commit drop as
select id
from auth.users
where email like 'qa.%@raisehubtesting.com'
  and raw_user_meta_data ->> 'qa_seed_batch' = 'qa_prelaunch_2026';

create temporary table qa_campaigns on commit drop as
select id
from public.campaigns
where name like '[QA]%'
   or organization_id in (
     select id from qa_users
   );

create temporary table qa_purchases on commit drop as
select id
from public.campaign_purchases
where user_id in (select id from qa_users)
   or campaign_id in (select id from qa_campaigns)
   or selected_organization_id in (select id from qa_users);

create temporary table qa_entitlements on commit drop as
select id
from public.customer_entitlements
where user_id in (select id from qa_users)
   or purchase_id in (select id from qa_purchases)
   or granted_by in (select id from qa_users);

delete from public.gift_passes
where purchaser_user_id in (select id from qa_users)
   or claimed_by_user_id in (select id from qa_users)
   or selected_organization_id in (select id from qa_users)
   or campaign_id in (select id from qa_campaigns)
   or purchase_id in (select id from qa_purchases)
   or entitlement_id in (select id from qa_entitlements);

delete from public.saved_offers
where user_id in (select id from qa_users)
   or offer_id in (
     select id from public.offers
     where title like '[QA]%'
        or business_id in (select id from qa_users)
   );

delete from public.redemptions
where user_id in (select id from qa_users)
   or offer_id in (
     select id from public.offers
     where title like '[QA]%'
        or business_id in (select id from qa_users)
   );

delete from public.offer_views
where user_id in (select id from qa_users)
   or offer_id in (
     select id from public.offers
     where title like '[QA]%'
        or business_id in (select id from qa_users)
   );

delete from public.offer_clicks
where user_id in (select id from qa_users)
   or offer_id in (
     select id from public.offers
     where title like '[QA]%'
        or business_id in (select id from qa_users)
   );

delete from public.notifications
where user_id in (select id from qa_users);

delete from public.owner_preview_profiles
where owner_user_id in (select id from qa_users)
   or subject_user_id in (select id from qa_users);

delete from public.owner_action_logs
where actor_user_id in (select id from qa_users)
   or subject_user_id in (select id from qa_users)
   or resource_id in (
     select id from qa_campaigns
     union
     select id from qa_purchases
   );

delete from public.customer_entitlements
where id in (select id from qa_entitlements);

delete from public.campaign_purchases
where id in (select id from qa_purchases);

delete from public.pricing_rules
where campaign_id in (select id from qa_campaigns)
   or organization_id in (
     select id
     from public.organizations
     where legacy_profile_id in (select id from qa_users)
   )
   or created_by in (select id from qa_users)
   or updated_by in (select id from qa_users);

delete from public.campaign_memberships
where campaign_id in (select id from qa_campaigns)
   or organization_membership_id in (
     select id
     from public.organization_memberships
     where user_id in (select id from qa_users)
   );

delete from public.campaigns
where id in (select id from qa_campaigns);

delete from public.organization_memberships
where user_id in (select id from qa_users)
   or invited_by in (select id from qa_users)
   or organization_id in (
     select id
     from public.organizations
     where legacy_profile_id in (select id from qa_users)
   );

delete from public.organizations
where legacy_profile_id in (select id from qa_users)
   or created_by in (select id from qa_users);

delete from public.offers
where title like '[QA]%'
   or business_id in (select id from qa_users);

delete from public.business_memberships
where user_id in (select id from qa_users)
   or invited_by in (select id from qa_users)
   or business_id in (
     select id
     from public.businesses
     where legacy_profile_id in (select id from qa_users)
   );

delete from public.businesses
where legacy_profile_id in (select id from qa_users)
   or created_by in (select id from qa_users);

delete from public.demo_profiles
where demo_group_id in (
  select id
  from public.demo_groups
  where group_key = 'qa_prelaunch_2026'
)
or profile_id in (select id from qa_users);

delete from public.demo_groups
where group_key = 'qa_prelaunch_2026';

delete from auth.users
where id in (select id from qa_users);

commit;

-- Expected result: zero rows.
select id, email
from auth.users
where email like 'qa.%@raisehubtesting.com'
   or raw_user_meta_data ->> 'qa_seed_batch' = 'qa_prelaunch_2026';