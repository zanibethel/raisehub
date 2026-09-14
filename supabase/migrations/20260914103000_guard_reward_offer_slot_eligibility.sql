create or replace function public.validate_partner_reward_redemption_eligibility()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_code text;
  v_tier text;
begin
  select code into v_code
  from public.partner_reward_marketplace_items
  where id = new.marketplace_item_id;

  if v_code = 'extra_offer_slot_30d' then
    select subscription_tier into v_tier
    from public.businesses
    where id = new.business_id;

    if v_tier = 'growth' then
      raise exception 'Growth plan businesses already have expanded offer capacity.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists partner_reward_redemption_eligibility_guard on public.partner_reward_redemptions;
create trigger partner_reward_redemption_eligibility_guard
before insert on public.partner_reward_redemptions
for each row execute function public.validate_partner_reward_redemption_eligibility();
