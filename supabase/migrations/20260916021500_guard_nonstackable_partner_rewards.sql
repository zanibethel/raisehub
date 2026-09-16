-- Prevent businesses from accidentally spending points twice on rewards whose
-- benefit cannot usefully stack while an existing redemption is still active.

update public.partner_reward_marketplace_items
set benefit_config = coalesce(benefit_config, '{}'::jsonb) || '{"non_stackable":true}'::jsonb,
    updated_at = now()
where code = 'website_branding_free_90d';

create or replace function public.guard_nonstackable_partner_reward_redemption()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_non_stackable boolean := false;
begin
  select coalesce((item.benefit_config ->> 'non_stackable')::boolean, false)
    into v_non_stackable
  from public.partner_reward_marketplace_items item
  where item.id = new.marketplace_item_id;

  if v_non_stackable and exists (
    select 1
    from public.partner_reward_redemptions redemption
    where redemption.business_id = new.business_id
      and redemption.marketplace_item_id = new.marketplace_item_id
      and redemption.status = 'active'
      and (redemption.ends_at is null or redemption.ends_at > now())
  ) then
    raise exception 'This Partner Reward is already active.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_nonstackable_partner_reward_redemption
  on public.partner_reward_redemptions;

create trigger guard_nonstackable_partner_reward_redemption
before insert on public.partner_reward_redemptions
for each row
execute function public.guard_nonstackable_partner_reward_redemption();
