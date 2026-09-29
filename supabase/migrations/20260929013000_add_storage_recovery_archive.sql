-- Private, service-role-only archive for accidental Storage object deletion recovery.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recovery-archive',
  'recovery-archive',
  false,
  5242880,
  array['image/png','image/jpeg','image/webp','image/gif']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- No anon/authenticated policies are intentionally created for this bucket.
