begin;

create unique index if not exists campaign_sellers_claimed_campaign_profile_unique_idx
  on public.campaign_sellers(campaign_id, seller_profile_id)
  where seller_profile_id is not null;

create or replace function public.list_claimable_campaign_sellers(
  p_actor_profile_id uuid
)
returns table(
  organization_id uuid,
  organization_name text,
  campaign_id uuid,
  campaign_name text,
  campaign_seller_id uuid,
  display_name text,
  referral_code text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.id,
    coalesce(nullif(btrim(o.name), ''), nullif(btrim(op.business_name), ''), nullif(btrim(op.display_name), ''), 'Organization'),
    c.id,
    c.name,
    cs.id,
    cs.display_name,
    cs.referral_code
  from public.organization_memberships om
  join public.organizations o on o.id = om.organization_id
  left join public.profiles op on op.id = o.legacy_profile_id
  join public.campaign_sellers cs on cs.organization_id = om.organization_id
  join public.campaigns c on c.id = cs.campaign_id
  where om.user_id = p_actor_profile_id
    and om.membership_role = 'seller'
    and om.status = 'active'
    and cs.status = 'active'
    and cs.seller_profile_id is null
    and c.status = 'active'
  order by 2, lower(c.name), lower(cs.display_name);
$$;

create or replace function public.claim_campaign_seller_roster_entry(
  p_actor_profile_id uuid,
  p_campaign_seller_id uuid
)
returns public.campaign_sellers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_profile public.seller_profiles%rowtype;
  v_campaign_seller public.campaign_sellers%rowtype;
  v_membership public.organization_memberships%rowtype;
begin
  if p_actor_profile_id is distinct from auth.uid() then
    raise exception 'You can only claim a roster entry for your own account.';
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
$$;

revoke all on function public.list_claimable_campaign_sellers(uuid)
  from public, anon, authenticated;
revoke all on function public.claim_campaign_seller_roster_entry(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.list_claimable_campaign_sellers(uuid)
  to service_role;
grant execute on function public.claim_campaign_seller_roster_entry(uuid, uuid)
  to authenticated, service_role;

comment on function public.claim_campaign_seller_roster_entry(uuid, uuid) is
  'Links the authenticated seller profile to an unclaimed campaign roster entry without changing its referral code or history.';

commit;
