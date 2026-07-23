create table if not exists public.business_offer_drafts (
  business_id uuid primary key references auth.users(id) on delete cascade,
  selected_goal text,
  selected_suggestion_id text,
  draft jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_offer_drafts enable row level security;

revoke all on table public.business_offer_drafts from anon;
grant select, insert, update, delete on table public.business_offer_drafts to authenticated;

create policy "Businesses can view their own offer draft"
on public.business_offer_drafts
for select
to authenticated
using ((select auth.uid()) = business_id);

create policy "Businesses can insert their own offer draft"
on public.business_offer_drafts
for insert
to authenticated
with check ((select auth.uid()) = business_id);

create policy "Businesses can update their own offer draft"
on public.business_offer_drafts
for update
to authenticated
using ((select auth.uid()) = business_id)
with check ((select auth.uid()) = business_id);

create policy "Businesses can delete their own offer draft"
on public.business_offer_drafts
for delete
to authenticated
using ((select auth.uid()) = business_id);
