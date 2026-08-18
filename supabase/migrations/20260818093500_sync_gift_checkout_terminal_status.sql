-- Keep pending gifts aligned with terminal checkout attempts.
-- Paid gifts are never changed by this trigger because their checkout status is paid.

create or replace function public.sync_gift_from_checkout_status()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.gift_pass_id is null or new.purchase_kind <> 'gift' then
    return new;
  end if;

  if new.status = 'expired' and old.status is distinct from 'expired' then
    update public.gift_passes
    set status = 'expired', updated_at = now()
    where id = new.gift_pass_id
      and status = 'pending_payment';
  elsif new.status in ('failed', 'canceled')
     and old.status is distinct from new.status then
    update public.gift_passes
    set status = 'cancelled', updated_at = now()
    where id = new.gift_pass_id
      and status = 'pending_payment';
  end if;

  return new;
end;
$$;

drop trigger if exists sync_gift_from_checkout_status on public.checkout_attempts;
create trigger sync_gift_from_checkout_status
after update of status on public.checkout_attempts
for each row execute function public.sync_gift_from_checkout_status();
