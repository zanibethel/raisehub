-- Prevent authenticated clients from escalating privilege or crossing the
-- Live/Demo boundary by editing security-sensitive profile columns directly.
-- Service-role and trusted database maintenance are unaffected.

create or replace function public.guard_profile_privilege_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if auth.uid() is null or old.id is distinct from auth.uid() then
    raise exception 'You can only update your own profile.';
  end if;

  if new.subscription_tier is distinct from old.subscription_tier then
    raise exception 'Subscription tier cannot be changed directly.';
  end if;

  if new.is_demo is distinct from old.is_demo
     or new.demo_group is distinct from old.demo_group then
    raise exception 'Profile environment cannot be changed directly.';
  end if;

  if new.email is distinct from old.email then
    raise exception 'Profile email cannot be changed directly.';
  end if;

  if new.role is distinct from old.role then
    if not (
      old.role = 'customer'
      and new.role in ('business', 'organization')
    ) then
      raise exception 'Profile role cannot be changed directly.';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_profile_privilege_fields() from public, anon, authenticated;
grant execute on function public.guard_profile_privilege_fields() to service_role;

drop trigger if exists guard_profile_privilege_fields on public.profiles;
create trigger guard_profile_privilege_fields
before update on public.profiles
for each row
execute function public.guard_profile_privilege_fields();
