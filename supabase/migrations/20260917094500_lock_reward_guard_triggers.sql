-- Trigger guard functions are internal database hooks, not public RPCs.
-- Revoke direct API execution while preserving trigger execution.

revoke all on function public.guard_featured_offer_partner_reward() from public, anon, authenticated;
revoke all on function public.guard_nonstackable_partner_reward_redemption() from public, anon, authenticated;
