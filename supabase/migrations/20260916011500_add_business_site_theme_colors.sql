alter table public.business_sites
  add column if not exists secondary_color text not null default '#0f172a',
  add column if not exists background_color text not null default '#ffffff',
  add column if not exists text_color text not null default '#0f172a';
