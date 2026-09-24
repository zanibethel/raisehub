-- Internal Partner Rewards synchronization is invoked by trusted server code
-- and database triggers/functions. Ordinary authenticated clients do not need
-- direct access to this SECURITY DEFINER helper.

revoke all on function public.sync_business_growth_rewards(uuid) from public;
revoke execute on function public.sync_business_growth_rewards(uuid) from anon;
revoke execute on function public.sync_business_growth_rewards(uuid) from authenticated;
grant execute on function public.sync_business_growth_rewards(uuid) to service_role;
