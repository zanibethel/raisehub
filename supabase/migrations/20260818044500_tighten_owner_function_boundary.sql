begin;

-- Owner-only demo metadata is managed through authenticated Owner workflows or
-- trusted service-role code. Anonymous callers do not need table privileges.
revoke all privileges on table public.demo_groups from anon;
revoke all privileges on table public.demo_profiles from anon;

-- These policies were originally created for PUBLIC. Narrow them to signed-in
-- callers so anonymous requests never need to evaluate is_owner().
alter policy demo_groups_owner_select
  on public.demo_groups to authenticated;
alter policy demo_groups_owner_insert
  on public.demo_groups to authenticated;
alter policy demo_groups_owner_update
  on public.demo_groups to authenticated;
alter policy demo_groups_owner_delete
  on public.demo_groups to authenticated;

alter policy demo_profiles_owner_select
  on public.demo_profiles to authenticated;
alter policy demo_profiles_owner_insert
  on public.demo_profiles to authenticated;
alter policy demo_profiles_owner_update
  on public.demo_profiles to authenticated;
alter policy demo_profiles_owner_delete
  on public.demo_profiles to authenticated;

-- is_owner() is a helper for authenticated RLS evaluation. It should not be a
-- signed-out RPC surface.
revoke execute on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated, service_role;

comment on function public.is_owner() is
  'Authenticated RLS helper that checks whether auth.uid() belongs to the platform Owner; not executable by anonymous callers.';

commit;
