-- =============================================================================
-- Sprint #43: fail closed during checkout fulfillment
-- =============================================================================
-- Existing RaiseHub data contains cross-environment relationships, so these
-- guards intentionally avoid rewriting historical rows. They protect every new
-- or updated checkout attempt, campaign purchase, and customer entitlement.

create or replace function public.raisehub_assert_environment_marker(
  p_is_demo boolean,
  p_demo_group text,
  p_record_name text
)
returns void
language plpgsql
immutable
set search_path = public
as $$
begin
  if p_is_demo is null then
    raise exception '% requires an explicit environment marker', p_record_name;
  end if;

  if p_is_demo is true and nullif(btrim(p_demo_group), '') is null then
    raise exception '% requires a demo group', p_record_name;
  end if;

  if p_is_demo is false and nullif(btrim(p_demo_group), '') is not null then
    raise exception '% cannot carry a demo group in production', p_record_name;
  end if;
end;
$$;

create or replace function public.raisehub_environments_match(
  p_left_is_demo boolean,
  p_left_demo_group text,
  p_right_is_demo boolean,
  p_right_demo_group text
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select
    p_left_is_demo is not null
    and p_right_is_demo is not null
    and p_left_is_demo = p_right_is_demo
    and nullif(btrim(p_left_demo_group), '') is not distinct from
        nullif(btrim(p_right_demo_group), '');
$$;

create or replace function public.validate_checkout_attempt_environment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  campaign_row public.campaigns%rowtype;
  user_row public.profiles%rowtype;
  organization_profile_row public.profiles%rowtype;
  organization_row public.organizations%rowtype;
  seller_campaign_id uuid;
  seller_organization_id uuid;
begin
  perform public.raisehub_assert_environment_marker(
    new.is_demo,
    new.demo_group,
    'checkout attempt'
  );

  select * into campaign_row
  from public.campaigns
  where id = new.campaign_id;

  if not found then
    raise exception 'checkout campaign was not found';
  end if;

  select * into user_row
  from public.profiles
  where id = new.user_id;

  if not found then
    raise exception 'checkout customer profile was not found';
  end if;

  select * into organization_profile_row
  from public.profiles
  where id = new.selected_organization_id
    and role = 'organization';

  if not found then
    raise exception 'checkout organization profile was not found';
  end if;

  select * into organization_row
  from public.organizations
  where id = new.organization_workspace_id
    and legacy_profile_id = new.selected_organization_id;

  if not found then
    raise exception 'checkout canonical organization does not match the selected organization';
  end if;

  if not public.raisehub_environments_match(
    new.is_demo, new.demo_group,
    campaign_row.is_demo, campaign_row.demo_group
  ) or not public.raisehub_environments_match(
    new.is_demo, new.demo_group,
    user_row.is_demo, user_row.demo_group
  ) or not public.raisehub_environments_match(
    new.is_demo, new.demo_group,
    organization_profile_row.is_demo, organization_profile_row.demo_group
  ) or not public.raisehub_environments_match(
    new.is_demo, new.demo_group,
    organization_row.is_demo, organization_row.demo_group
  ) then
    raise exception 'checkout attempt crosses data environments';
  end if;

  if new.campaign_seller_id is not null then
    select campaign_id, organization_id
      into seller_campaign_id, seller_organization_id
    from public.campaign_sellers
    where id = new.campaign_seller_id
      and status = 'active';

    if not found
      or seller_campaign_id is distinct from new.campaign_id
      or seller_organization_id is distinct from new.organization_workspace_id then
      raise exception 'checkout seller does not belong to the campaign organization';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists checkout_attempts_validate_environment
  on public.checkout_attempts;

create trigger checkout_attempts_validate_environment
before insert or update of
  user_id,
  campaign_id,
  selected_organization_id,
  organization_workspace_id,
  campaign_seller_id,
  is_demo,
  demo_group
on public.checkout_attempts
for each row
execute function public.validate_checkout_attempt_environment();

create or replace function public.validate_campaign_purchase_environment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  campaign_row public.campaigns%rowtype;
  user_row public.profiles%rowtype;
  organization_profile_row public.profiles%rowtype;
  organization_row public.organizations%rowtype;
begin
  perform public.raisehub_assert_environment_marker(
    new.is_demo,
    new.demo_group,
    'campaign purchase'
  );

  select * into campaign_row from public.campaigns where id = new.campaign_id;
  select * into user_row from public.profiles where id = new.user_id;
  select * into organization_profile_row
    from public.profiles
    where id = new.selected_organization_id and role = 'organization';
  select * into organization_row
    from public.organizations
    where id = new.organization_workspace_id
      and legacy_profile_id = new.selected_organization_id;

  if campaign_row.id is null
    or user_row.id is null
    or organization_profile_row.id is null
    or organization_row.id is null then
    raise exception 'campaign purchase is missing a validated parent';
  end if;

  if not public.raisehub_environments_match(
    new.is_demo, new.demo_group,
    campaign_row.is_demo, campaign_row.demo_group
  ) or not public.raisehub_environments_match(
    new.is_demo, new.demo_group,
    user_row.is_demo, user_row.demo_group
  ) or not public.raisehub_environments_match(
    new.is_demo, new.demo_group,
    organization_profile_row.is_demo, organization_profile_row.demo_group
  ) or not public.raisehub_environments_match(
    new.is_demo, new.demo_group,
    organization_row.is_demo, organization_row.demo_group
  ) then
    raise exception 'campaign purchase crosses data environments';
  end if;

  return new;
end;
$$;

drop trigger if exists campaign_purchases_validate_environment
  on public.campaign_purchases;

create trigger campaign_purchases_validate_environment
before insert or update of
  user_id,
  campaign_id,
  selected_organization_id,
  organization_workspace_id,
  is_demo,
  demo_group
on public.campaign_purchases
for each row
execute function public.validate_campaign_purchase_environment();

create or replace function public.validate_customer_entitlement_environment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  purchase_row public.campaign_purchases%rowtype;
  user_row public.profiles%rowtype;
begin
  perform public.raisehub_assert_environment_marker(
    new.is_demo,
    new.demo_group,
    'customer entitlement'
  );

  select * into user_row
  from public.profiles
  where id = new.user_id;

  if user_row.id is null or not public.raisehub_environments_match(
    new.is_demo, new.demo_group,
    user_row.is_demo, user_row.demo_group
  ) then
    raise exception 'customer entitlement does not match the customer environment';
  end if;

  if new.purchase_id is not null then
    select * into purchase_row
    from public.campaign_purchases
    where id = new.purchase_id;

    if purchase_row.id is null or not public.raisehub_environments_match(
      new.is_demo, new.demo_group,
      purchase_row.is_demo, purchase_row.demo_group
    ) then
      raise exception 'customer entitlement does not match the purchase environment';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists customer_entitlements_validate_environment
  on public.customer_entitlements;

create trigger customer_entitlements_validate_environment
before insert or update of
  user_id,
  purchase_id,
  is_demo,
  demo_group
on public.customer_entitlements
for each row
execute function public.validate_customer_entitlement_environment();

revoke all on function public.raisehub_assert_environment_marker(boolean, text, text)
  from public, anon, authenticated;
revoke all on function public.raisehub_environments_match(boolean, text, boolean, text)
  from public, anon, authenticated;
revoke all on function public.validate_checkout_attempt_environment()
  from public, anon, authenticated;
revoke all on function public.validate_campaign_purchase_environment()
  from public, anon, authenticated;
revoke all on function public.validate_customer_entitlement_environment()
  from public, anon, authenticated;
