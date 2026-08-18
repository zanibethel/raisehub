begin;

-- `anon` previously held an explicit EXECUTE grant in addition to PUBLIC's
-- default function privilege. Revoke it directly so signed-out callers cannot
-- invoke the Owner helper through PostgREST.
revoke execute on function public.is_owner() from anon;

grant execute on function public.is_owner() to authenticated, service_role;

commit;
