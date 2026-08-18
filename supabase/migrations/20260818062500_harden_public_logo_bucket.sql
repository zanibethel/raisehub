-- Launch security: public branding assets must remain images and bounded in size.
-- Existing organization/demo upload routes use service_role and bypass object RLS.
-- The remaining authenticated browser upload path is business-logo-only.

update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]::text[]
where id = 'logos';

drop policy if exists "Authenticated users can upload logos" on storage.objects;

create policy "Authenticated users can upload business logos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'logos'
  and (storage.foldername(name))[1] = 'businesses'
);
