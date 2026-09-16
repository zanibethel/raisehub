begin;

alter table public.business_sites
  add column if not exists logo_url text,
  add column if not exists hero_image_url text,
  add column if not exists hours_copy text,
  add column if not exists facebook_url text,
  add column if not exists instagram_url text,
  add column if not exists tiktok_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-sites',
  'business-sites',
  true,
  5242880,
  array['image/png','image/jpeg','image/webp','image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Business site assets are public" on storage.objects;
create policy "Business site assets are public"
  on storage.objects
  for select
  to public
  using (bucket_id = 'business-sites');

drop policy if exists "Business members can upload site assets" on storage.objects;
create policy "Business members can upload site assets"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'business-sites'
    and exists (
      select 1
      from public.business_memberships bm
      where bm.business_id::text = (storage.foldername(name))[1]
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
        and bm.membership_role in ('owner', 'manager')
    )
  );

drop policy if exists "Business members can update site assets" on storage.objects;
create policy "Business members can update site assets"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'business-sites'
    and exists (
      select 1
      from public.business_memberships bm
      where bm.business_id::text = (storage.foldername(name))[1]
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
        and bm.membership_role in ('owner', 'manager')
    )
  )
  with check (
    bucket_id = 'business-sites'
    and exists (
      select 1
      from public.business_memberships bm
      where bm.business_id::text = (storage.foldername(name))[1]
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
        and bm.membership_role in ('owner', 'manager')
    )
  );

drop policy if exists "Business members can delete site assets" on storage.objects;
create policy "Business members can delete site assets"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'business-sites'
    and exists (
      select 1
      from public.business_memberships bm
      where bm.business_id::text = (storage.foldername(name))[1]
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
        and bm.membership_role in ('owner', 'manager')
    )
  );

commit;
