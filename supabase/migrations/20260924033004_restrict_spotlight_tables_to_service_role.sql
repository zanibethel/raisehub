-- Spotlight records are managed through trusted server-side service-role code.
-- Keep direct browser roles away from these RLS-protected internal tables.

revoke all privileges on table public.spotlight_campaigns from public;
revoke all privileges on table public.spotlight_campaigns from anon;
revoke all privileges on table public.spotlight_campaigns from authenticated;
grant select, insert, update, delete on table public.spotlight_campaigns to service_role;

revoke all privileges on table public.spotlight_interactions from public;
revoke all privileges on table public.spotlight_interactions from anon;
revoke all privileges on table public.spotlight_interactions from authenticated;
grant select, insert, update, delete on table public.spotlight_interactions to service_role;
