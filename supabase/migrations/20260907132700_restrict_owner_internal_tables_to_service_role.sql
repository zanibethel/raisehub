begin;

revoke all privileges on table public.owner_action_logs from anon, authenticated;
revoke all privileges on table public.owner_preview_profiles from anon, authenticated;

grant select, insert, update, delete on table public.owner_action_logs to service_role;
grant select, insert, update, delete on table public.owner_preview_profiles to service_role;

commit;
