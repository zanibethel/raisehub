begin;

-- Workspace creation is an authenticated user action. Remove the inherited
-- PUBLIC/anonymous grant while preserving authenticated and service-role use.
revoke execute on function public.create_business_workspace(text) from public, anon;
grant execute on function public.create_business_workspace(text) to authenticated, service_role;

revoke execute on function public.create_organization_workspace(text) from public, anon;
grant execute on function public.create_organization_workspace(text) to authenticated, service_role;

-- Trigger functions are invoked by PostgreSQL triggers and must not be exposed
-- as directly callable PostgREST RPC endpoints.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

revoke execute on function public.provision_organization_workspace_profile_trigger() from public, anon, authenticated;
grant execute on function public.provision_organization_workspace_profile_trigger() to service_role;

commit;
