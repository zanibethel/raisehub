create or replace function public.sync_partner_point_event_environment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  business_is_demo boolean;
  business_demo_group text;
begin
  select b.is_demo, b.demo_group
    into business_is_demo, business_demo_group
  from public.businesses b
  where b.id = new.business_id;

  if not found then
    raise exception 'Partner reward event requires a valid business.';
  end if;

  new.is_demo := coalesce(business_is_demo, false);
  new.demo_group := business_demo_group;
  return new;
end;
$$;

drop trigger if exists partner_point_events_sync_environment on public.partner_point_events;
create trigger partner_point_events_sync_environment
before insert or update of business_id
on public.partner_point_events
for each row
execute function public.sync_partner_point_event_environment();

revoke all on function public.sync_partner_point_event_environment() from public;
revoke all on function public.sync_partner_point_event_environment() from anon;
revoke all on function public.sync_partner_point_event_environment() from authenticated;
