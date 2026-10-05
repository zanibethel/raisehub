-- Legacy overloads predate the explicit production/demo environment boundary.
-- Keep the newer guarded signatures public and remove direct client execution here.
revoke execute on function public.get_campaign_recovery_context(uuid) from anon, authenticated;
revoke execute on function public.get_public_campaign_progress(uuid[]) from anon, authenticated;
revoke execute on function public.get_public_campaign_sellers(uuid) from anon, authenticated;
revoke execute on function public.resolve_campaign_seller_referral(uuid, text) from anon, authenticated;
