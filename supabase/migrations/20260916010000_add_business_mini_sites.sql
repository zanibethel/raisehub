begin;

create table if not exists public.business_sites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  slug text not null unique,
  site_title text not null,
  hero_heading text not null default '',
  hero_copy text not null default '',
  about_heading text not null default 'About us',
  about_copy text not null default '',
  phone text,
  address text,
  contact_email text,
  accent_color text not null default '#2563eb',
  section_order jsonb not null default '["hero","about","offers","contact"]'::jsonb,
  show_offers boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_sites_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index if not exists business_sites_published_slug_idx
  on public.business_sites (slug)
  where is_published = true;

alter table public.business_sites enable row level security;

revoke all on table public.business_sites from anon, authenticated;
grant select on table public.business_sites to anon, authenticated;
grant insert, update, delete on table public.business_sites to authenticated;

create policy business_sites_public_read_published
  on public.business_sites
  for select
  to anon, authenticated
  using (
    is_published = true
    or public.is_owner()
    or exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = business_sites.business_id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
    )
  );

create policy business_sites_member_insert
  on public.business_sites
  for insert
  to authenticated
  with check (
    public.is_owner()
    or exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = business_sites.business_id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
        and bm.membership_role in ('owner', 'manager')
    )
  );

create policy business_sites_member_update
  on public.business_sites
  for update
  to authenticated
  using (
    public.is_owner()
    or exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = business_sites.business_id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
        and bm.membership_role in ('owner', 'manager')
    )
  )
  with check (
    public.is_owner()
    or exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = business_sites.business_id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
        and bm.membership_role in ('owner', 'manager')
    )
  );

create policy business_sites_member_delete
  on public.business_sites
  for delete
  to authenticated
  using (
    public.is_owner()
    or exists (
      select 1
      from public.business_memberships bm
      where bm.business_id = business_sites.business_id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
        and bm.membership_role = 'owner'
    )
  );

comment on table public.business_sites is
  'RaiseHub-hosted mini websites owned by a business. One site per business for the MVP.';

commit;
