-- Prevent the 90-day branding-free Website Builder reward from starting before
-- a business has a published RaiseHub website. Keep the existing offer-capacity
-- eligibility rule in the same trigger function.

create or replace function public.validate_partner_reward_redemption_eligibility()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_code text;
  v_tier text;
begin
  select code
    into v_code
  from public.partner_reward_marketplace_items
  where id = new.marketplace_item_id;

  if v_code = 'extra_offer_slot_30d' then
    select subscription_tier
      into v_tier
    from public.businesses
    where id = new.business_id;

    if v_tier = 'growth' then
      raise exception 'Growth plan businesses already have expanded offer capacity.';
    end if;
  end if;

  if v_code = 'website_branding_free_90d' and not exists (
    select 1
    from public.business_sites site
    where site.business_id = new.business_id
      and site.is_published = true
  ) then
    raise exception 'Publish your RaiseHub website before redeeming this reward.';
  end if;

  return new;
end;
$$;
