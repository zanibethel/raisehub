-- Harden self-service seller roster claims so SECURITY DEFINER execution cannot
-- bridge Live/Demo environments or claim against a campaign from another
-- canonical organization.

create or replace function public.claim_campaign_seller_roster_entry(
  p_actor_profile_id uuid,
  p_campaign_seller_id uuid
)
returns public.campaign_sellers
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor_profile public.profiles%rowtype;
  v_seller_profile public.seller_profiles%rowtype;
  v_campaign_seller public.campaign_sellers%rowtype;
  v_campaign public.campaigns%rowtype;
  v_organization public.organizations%rowtype;
  v_membership public.organization_memberships%rowtype;
begin
  if p_actor_profile_id is distinct from auth.uid() then
    raise exception 'You can only claim a roster entry for your own account.';
  end if;

  select * into v_actor_profile
  from public.profiles
  where id = p_actor_profile_id;

  if v_actor_profile.id is null then
    raise exception 'A RaiseHub profile is required.';
  end if;

  select * into v_seller_profile
  from public.seller_profiles
  where user_id = p_actor_profile_id
    and status = 'active';

  if v_seller_profile.id is null then
    raise exception 'An active seller profile is required.';
  end if;

  select * into v_campaign_seller
  from public.campaign_sellers
  where id = p_campaign_seller_id
  for update;

  if v_campaign_seller.id is null then
    raise exception 'Roster entry not found.';
  end if;

  if v_campaign_seller.status <> 'active' then
    raise exception 'This roster entry is not available to claim.';
  end if;

  select * into v_campaign
  from public.campaigns
  where id = v_campaign_seller.campaign_id;

  if v_campaign.id is null then
    raise exception 'Campaign not found.';
  end if;

  select * into v_organization
  from public.organizations
  where id = v_campaign_seller.organization_id;

  if v_organization.id is null then
    raise exception 'Organization not found.';
  end if;

  if not (
    v_campaign.canonical_organization_id = v_organization.id
    or (
      v_campaign.canonical_organization_id is null
      and (
        v_campaign.organization_id = v_organization.id
        or v_campaign.organization_id = v_organization.legacy_profile_id
      )
    )
  ) then
    raise exception 'Campaign and roster organization do not match.';
  end if;

  if v_campaign.is_demo is distinct from v_organization.is_demo
     or v_campaign.demo_group is distinct from v_organization.demo_group then
    raise exception 'Campaign environment does not match its organization.';
  end if;

  if v_actor_profile.is_demo is distinct from v_organization.is_demo
     or v_actor_profile.demo_group is distinct from v_organization.demo_group then
    raise exception 'Your account environment does not match this organization.';
  end if;

  if v_campaign_seller.seller_profile_id is not null then
    if v_campaign_seller.seller_profile_id = v_seller_profile.id then
      return v_campaign_seller;
    end if;
    raise exception 'This roster entry has already been claimed.';
  end if;

  select * into v_membership
  from public.organization_memberships
  where organization_id = v_campaign_seller.organization_id
    and user_id = p_actor_profile_id
    and membership_role = 'seller'
    and status = 'active'
  limit 1;

  if v_membership.id is null then
    raise exception 'Join this organization as a seller before claiming a roster entry.';
  end if;

  if v_membership.is_demo is distinct from v_organization.is_demo
     or v_membership.demo_group is distinct from v_organization.demo_group then
    raise exception 'Seller membership environment does not match this organization.';
  end if;

  if exists (
    select 1
    from public.campaign_sellers existing_claim
    where existing_claim.campaign_id = v_campaign_seller.campaign_id
      and existing_claim.seller_profile_id = v_seller_profile.id
      and existing_claim.id <> v_campaign_seller.id
  ) then
    raise exception 'Your seller profile is already linked to this campaign.';
  end if;

  update public.organization_memberships
  set seller_profile_id = coalesce(seller_profile_id, v_seller_profile.id)
  where id = v_membership.id;

  update public.campaign_sellers
  set seller_profile_id = v_seller_profile.id,
      updated_at = now()
  where id = v_campaign_seller.id
  returning * into v_campaign_seller;

  return v_campaign_seller;
end;
$function$;

revoke all on function public.claim_campaign_seller_roster_entry(uuid, uuid)
from public, anon;

grant execute on function public.claim_campaign_seller_roster_entry(uuid, uuid)
to authenticated, service_role;
