begin;

revoke execute on function public.set_business_event_environment() from public;
revoke execute on function public.set_business_event_environment() from anon;
revoke execute on function public.set_business_event_environment() from authenticated;

revoke execute on function public.create_business_event_promotion_from_reward() from public;
revoke execute on function public.create_business_event_promotion_from_reward() from anon;
revoke execute on function public.create_business_event_promotion_from_reward() from authenticated;

commit;
