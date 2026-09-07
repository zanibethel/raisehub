-- finalize_due_redemptions is an internal maintenance primitive. It is invoked from
-- SECURITY DEFINER redemption RPCs and server-side service-role code, but should
-- never be directly callable by an ordinary signed-in client.
revoke all on function public.finalize_due_redemptions() from public;
revoke execute on function public.finalize_due_redemptions() from anon;
revoke execute on function public.finalize_due_redemptions() from authenticated;
grant execute on function public.finalize_due_redemptions() to service_role;
