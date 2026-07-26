begin;

revoke all on function public.create_campaign_sellers(uuid, uuid, text[]) from public, anon, authenticated;
revoke all on function public.update_campaign_seller(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.list_campaign_sellers(uuid, uuid) from public, anon, authenticated;

grant execute on function public.create_campaign_sellers(uuid, uuid, text[]) to service_role;
grant execute on function public.update_campaign_seller(uuid, uuid, text, text) to service_role;
grant execute on function public.list_campaign_sellers(uuid, uuid) to service_role;

commit;
