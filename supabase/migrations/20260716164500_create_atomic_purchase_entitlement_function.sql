-- =============================================================================
-- Atomic campaign purchase and customer entitlement creation
-- =============================================================================
-- This function is intentionally executable only by the service role.
--
-- Paid pass purchase:
--   1. Creates campaign_purchases history.
--   2. Creates one active six-month purchased_pass entitlement.
--   3. Rolls back both records if either write fails.
--
-- Donation-only support:
--   1. Creates campaign_purchases history.
--   2. Does not create another entitlement.

create unique index if not exists customer_entitlements_purchase_id_unique_idx
  on public.customer_entitlements (purchase_id)
  where purchase_id is not null;

create or replace function public.create_campaign_purchase_with_entitlement(
  p_campaign_id uuid,
  p_user_id uuid,
  p_buyer_email text,
  p_selected_organization_id uuid,
  p_donation_amount numeric,
  p_seller_name text,
  p_amount_paid numeric,
  p_platform_fee numeric,
  p_organization_earnings numeric,
  p_is_demo boolean,
  p_demo_group text,
  p_grant_entitlement boolean,
  p_pricing_rule_id uuid,
  p_pricing_scope text,
  p_pass_price_charged numeric,
  p_platform_fee_percent numeric,
  p_organization_pass_earnings numeric,
  p_pricing_resolved_at timestamptz
)
returns table (
  purchase_id uuid,
  entitlement_id uuid,
  entitlement_starts_at timestamptz,
  entitlement_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase_id uuid;
  v_entitlement_id uuid;
  v_starts_at timestamptz;
  v_expires_at timestamptz;
  v_donation_amount numeric := round(greatest(coalesce(p_donation_amount, 0), 0), 2);
  v_amount_paid numeric := round(coalesce(p_amount_paid, 0), 2);
  v_platform_fee numeric := round(coalesce(p_platform_fee, 0), 2);
  v_organization_earnings numeric :=
    round(coalesce(p_organization_earnings, 0), 2);
  v_pass_price numeric :=
    case
      when p_pass_price_charged is null then null
      else round(p_pass_price_charged, 2)
    end;
  v_platform_fee_percent numeric :=
    case
      when p_platform_fee_percent is null then null
      else round(p_platform_fee_percent, 2)
    end;
  v_organization_pass_earnings numeric :=
    case
      when p_organization_pass_earnings is null then null
      else round(p_organization_pass_earnings, 2)
    end;
begin
  if p_campaign_id is null then
    raise exception 'campaign_id is required';
  end if;

  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if p_selected_organization_id is null then
    raise exception 'selected_organization_id is required';
  end if;

  if not exists (
    select 1
    from public.campaigns
    where campaigns.id = p_campaign_id
  ) then
    raise exception 'campaign does not exist';
  end if;

  if not exists (
    select 1
    from public.profiles
    where profiles.id = p_user_id
  ) then
    raise exception 'customer profile does not exist';
  end if;

  if not exists (
    select 1
    from public.profiles
    where profiles.id = p_selected_organization_id
      and profiles.role = 'organization'
  ) then
    raise exception 'selected organization does not exist';
  end if;

  if p_is_demo = false and p_demo_group is not null then
    raise exception 'production purchases cannot have a demo_group';
  end if;

  if v_amount_paid < 0 then
    raise exception 'amount_paid cannot be negative';
  end if;

  if v_platform_fee < 0 then
    raise exception 'platform_fee cannot be negative';
  end if;

  if v_organization_earnings < 0 then
    raise exception 'organization_earnings cannot be negative';
  end if;

  if round(v_platform_fee + v_organization_earnings, 2) <> v_amount_paid then
    raise exception
      'platform fee and organization earnings must equal amount paid';
  end if;

  if p_grant_entitlement then
    if v_pass_price is null or v_pass_price <= 0 then
      raise exception 'paid pass purchases require a positive pass price';
    end if;

    if p_pricing_scope is null then
      raise exception 'paid pass purchases require a pricing scope';
    end if;

    if v_platform_fee_percent is null
      or v_platform_fee_percent < 0
      or v_platform_fee_percent > 100 then
      raise exception 'paid pass purchases require a valid platform fee percent';
    end if;

    if v_organization_pass_earnings is null
      or v_organization_pass_earnings < 0 then
      raise exception
        'paid pass purchases require organization pass earnings';
    end if;

    if p_pricing_resolved_at is null then
      raise exception 'paid pass purchases require pricing_resolved_at';
    end if;

    if round(v_pass_price + v_donation_amount, 2) <> v_amount_paid then
      raise exception 'pass price and donation must equal amount paid';
    end if;

    if round(v_platform_fee + v_organization_pass_earnings, 2)
      <> v_pass_price then
      raise exception
        'platform fee and organization pass earnings must equal pass price';
    end if;

    if round(
      v_pass_price * (v_platform_fee_percent / 100),
      2
    ) <> v_platform_fee then
      raise exception
        'platform fee amount does not match the pricing percentage';
    end if;

    if round(
      v_organization_pass_earnings + v_donation_amount,
      2
    ) <> v_organization_earnings then
      raise exception
        'organization earnings do not match pass share plus donation';
    end if;
  else
    if v_amount_paid <= 0 then
      raise exception 'donation-only support requires a positive amount';
    end if;

    if v_amount_paid <> v_donation_amount then
      raise exception 'donation-only amount must equal the donation';
    end if;

    if v_platform_fee <> 0 then
      raise exception 'donation-only support cannot include a platform fee';
    end if;

    if v_organization_earnings <> v_donation_amount then
      raise exception
        'donation-only organization earnings must equal the donation';
    end if;

    if p_pricing_rule_id is not null
      or p_pricing_scope is not null
      or v_pass_price is not null
      or v_platform_fee_percent is not null
      or v_organization_pass_earnings is not null
      or p_pricing_resolved_at is not null then
      raise exception
        'donation-only support cannot include a pass pricing snapshot';
    end if;
  end if;

  insert into public.campaign_purchases (
    campaign_id,
    user_id,
    buyer_email,
    amount_paid,
    platform_fee,
    organization_earnings,
    payment_status,
    selected_organization_id,
    donation_amount,
    seller_name,
    is_demo,
    demo_group,
    pricing_rule_id,
    pricing_scope,
    pass_price_charged,
    platform_fee_percent,
    organization_pass_earnings,
    pricing_resolved_at
  )
  values (
    p_campaign_id,
    p_user_id,
    nullif(btrim(p_buyer_email), ''),
    v_amount_paid,
    v_platform_fee,
    v_organization_earnings,
    'test_paid',
    p_selected_organization_id,
    v_donation_amount,
    nullif(btrim(p_seller_name), ''),
    coalesce(p_is_demo, false),
    case
      when coalesce(p_is_demo, false) then nullif(btrim(p_demo_group), '')
      else null
    end,
    case when p_grant_entitlement then p_pricing_rule_id else null end,
    case when p_grant_entitlement then p_pricing_scope else null end,
    case when p_grant_entitlement then v_pass_price else null end,
    case when p_grant_entitlement then v_platform_fee_percent else null end,
    case
      when p_grant_entitlement then v_organization_pass_earnings
      else null
    end,
    case when p_grant_entitlement then p_pricing_resolved_at else null end
  )
  returning id into v_purchase_id;

  if p_grant_entitlement then
    v_starts_at := now();
    v_expires_at := v_starts_at + interval '6 months';

    insert into public.customer_entitlements (
      user_id,
      purchase_id,
      entitlement_type,
      status,
      starts_at,
      expires_at,
      is_demo,
      demo_group
    )
    values (
      p_user_id,
      v_purchase_id,
      'purchased_pass',
      'active',
      v_starts_at,
      v_expires_at,
      coalesce(p_is_demo, false),
      case
        when coalesce(p_is_demo, false) then nullif(btrim(p_demo_group), '')
        else null
      end
    )
    returning id into v_entitlement_id;
  else
    v_entitlement_id := null;
    v_starts_at := null;
    v_expires_at := null;
  end if;

  return query
  select
    v_purchase_id,
    v_entitlement_id,
    v_starts_at,
    v_expires_at;
end;
$$;

comment on function public.create_campaign_purchase_with_entitlement(
  uuid,
  uuid,
  text,
  uuid,
  numeric,
  text,
  numeric,
  numeric,
  numeric,
  boolean,
  text,
  boolean,
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  timestamptz
) is
  'Atomically records campaign support and creates a six-month customer entitlement only for a verified paid pass purchase.';

revoke all on function public.create_campaign_purchase_with_entitlement(
  uuid,
  uuid,
  text,
  uuid,
  numeric,
  text,
  numeric,
  numeric,
  numeric,
  boolean,
  text,
  boolean,
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  timestamptz
) from public;

revoke all on function public.create_campaign_purchase_with_entitlement(
  uuid,
  uuid,
  text,
  uuid,
  numeric,
  text,
  numeric,
  numeric,
  numeric,
  boolean,
  text,
  boolean,
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  timestamptz
) from anon;

revoke all on function public.create_campaign_purchase_with_entitlement(
  uuid,
  uuid,
  text,
  uuid,
  numeric,
  text,
  numeric,
  numeric,
  numeric,
  boolean,
  text,
  boolean,
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  timestamptz
) from authenticated;

grant execute on function public.create_campaign_purchase_with_entitlement(
  uuid,
  uuid,
  text,
  uuid,
  numeric,
  text,
  numeric,
  numeric,
  numeric,
  boolean,
  text,
  boolean,
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  timestamptz
) to service_role;
