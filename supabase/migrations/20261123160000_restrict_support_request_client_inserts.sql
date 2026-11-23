-- Security: support requests must be created by the validated server endpoint.
-- Service role retains INSERT. Public clients retain existing SELECT/UPDATE
-- grants subject to RLS, so owner workflows are not changed here.
revoke insert on table public.support_requests from anon, authenticated;

drop policy if exists "Anyone can create a support request" on public.support_requests;

-- Fail closed: prevent accidental re-grant of direct client INSERT from
-- creating public records without an explicit reviewed policy.
-- The existing owner ALL policy still permits owners if INSERT is later granted.
