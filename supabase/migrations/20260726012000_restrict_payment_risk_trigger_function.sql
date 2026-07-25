begin;

revoke all on function public.prevent_payment_risk_audit_mutation() from public, anon, authenticated;
grant execute on function public.prevent_payment_risk_audit_mutation() to service_role;

commit;
