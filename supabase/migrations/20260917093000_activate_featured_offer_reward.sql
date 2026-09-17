-- Activate the first promotional Partner Reward by wiring it to the existing
-- Exclusive Local Deals carousel. The newest qualifying active offer for a
-- rewarded business is promoted for the duration of the redemption.

update public.partner_reward_marketplace_items
set description = 'Feature your newest qualifying active offer at the front of RaiseHub''s Exclusive Local Deals carousel for 7 days.',
    benefit_config = coalesce(benefit_config, '{}'::jsonb)
      || '{"promotion_type":"featured_offer","non_stackable":true}'::jsonb,
    is_active = true,
    updated_at = now()
where code = 'featured_offer_7d';

create or replace function public.guard_featured_offer_partner_reward()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  select item.code
    into v_code
  from public.partner_reward_marketplace_items item
  where item.id = new.marketplace_item_id;

  if v_code = 'featured_offer_7d' and not exists (
    select 1
    from public.businesses business
    join public.offers offer
      on offer.business_id = business.id
      or offer.business_id = business.legacy_profile_id
    where business.id = new.business_id
      and offer.is_active = true
      and (offer.starts_at is null or offer.starts_at <= now())
      and (offer.ends_at is null or offer.ends_at >= now())
  ) then
    raise exception 'Add an active offer before using the Featured Offer reward.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_featured_offer_partner_reward
  on public.partner_reward_redemptions;

create trigger guard_featured_offer_partner_reward
before insert on public.partner_reward_redemptions
for each row
execute function public.guard_featured_offer_partner_reward();
