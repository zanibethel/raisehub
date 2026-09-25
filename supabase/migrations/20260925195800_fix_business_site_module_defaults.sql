begin;

alter table public.business_sites
  alter column enabled_modules set default '[]'::jsonb;

update public.business_sites
set enabled_modules = '[]'::jsonb
where enabled_modules = '["offers"]'::jsonb;

commit;
