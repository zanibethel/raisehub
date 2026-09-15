create or replace function public.enforce_partner_point_event_verification_eligibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_demo boolean;
  v_demo_group text;
  v_verification_status text;
begin
  select b.is_demo, b.demo_group
  into v_is_demo, v_demo_group
  from public.businesses b
  where b.id = new.business_id;

  if not found then
    raise exception 'Partner reward business not found.';
  end if;

  new.is_demo := coalesce(v_is_demo, false);
  new.demo_group := v_demo_group;

  if new.eligibility_status in ('pending','eligible') then
    if coalesce(v_is_demo, false) then
      new.eligibility_status := 'eligible';
    else
      select bv.status
      into v_verification_status
      from public.business_verifications bv
      where bv.business_id = new.business_id;

      new.eligibility_status := case
        when v_verification_status = 'approved' then 'eligible'
        else 'pending'
      end;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_partner_point_event_verification_eligibility() from public, anon, authenticated;

drop trigger if exists sync_partner_point_event_environment_trigger on public.partner_point_events;
drop trigger if exists enforce_partner_point_event_verification_eligibility_trigger on public.partner_point_events;

create trigger enforce_partner_point_event_verification_eligibility_trigger
before insert or update of business_id, eligibility_status
on public.partner_point_events
for each row
execute function public.enforce_partner_point_event_verification_eligibility();
