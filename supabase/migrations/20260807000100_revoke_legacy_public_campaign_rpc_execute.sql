-- Record the post-deployment cleanup applied after PR #94 reached both
-- RaiseHub Live and RaiseHub Demo.
--
-- The environment-aware overloads remain publicly callable because signed-out
-- campaign pages use them. Only the legacy signatures are removed from anon and
-- authenticated access. service_role access is intentionally preserved.

revoke execute on function public.get_campaign_recovery_context(uuid)
  from anon, authenticated;

revoke execute on function public.get_public_campaign_progress(uuid[])
  from anon, authenticated;

revoke execute on function public.get_public_campaign_sellers(uuid)
  from anon, authenticated;

revoke execute on function public.resolve_campaign_seller_referral(uuid, text)
  from anon, authenticated;
