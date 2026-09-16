create table if not exists public.spotlight_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  cta_label text,
  cta_url text,
  secondary_cta_label text,
  secondary_cta_url text,
  kind text not null default 'announcement' check (kind in ('announcement','upgrade','business_promo','organization_promo','system')),
  audience_roles text[] not null default array['customer','business','organization']::text[],
  environment_scope text not null default 'all' check (environment_scope in ('all','production','demo')),
  target_business_id uuid references public.businesses(id) on delete cascade,
  target_organization_id uuid references public.organizations(id) on delete cascade,
  priority integer not null default 100,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default false,
  dismissible boolean not null default true,
  max_views_per_user integer not null default 1 check (max_views_per_user > 0),
  repeat_after_hours integer check (repeat_after_hours is null or repeat_after_hours > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spotlight_campaign_dates_check check (ends_at is null or ends_at > starts_at),
  constraint spotlight_campaign_single_target_check check (not (target_business_id is not null and target_organization_id is not null))
);

create index if not exists spotlight_campaigns_active_window_idx
  on public.spotlight_campaigns (is_active, starts_at, ends_at, priority desc);

create index if not exists spotlight_campaigns_business_idx
  on public.spotlight_campaigns (target_business_id)
  where target_business_id is not null;

create index if not exists spotlight_campaigns_organization_idx
  on public.spotlight_campaigns (target_organization_id)
  where target_organization_id is not null;

create table if not exists public.spotlight_interactions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.spotlight_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_key text not null default '',
  view_count integer not null default 0 check (view_count >= 0),
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  dismissed_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, user_id, workspace_key)
);

create index if not exists spotlight_interactions_user_idx
  on public.spotlight_interactions (user_id, workspace_key, campaign_id);

alter table public.spotlight_campaigns enable row level security;
alter table public.spotlight_interactions enable row level security;

create or replace function public.touch_spotlight_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger spotlight_campaigns_touch_updated_at
before update on public.spotlight_campaigns
for each row execute function public.touch_spotlight_updated_at();

create trigger spotlight_interactions_touch_updated_at
before update on public.spotlight_interactions
for each row execute function public.touch_spotlight_updated_at();

comment on table public.spotlight_campaigns is 'Owner-managed Spotlight carousel campaigns for announcements, upgrades, and targeted promotions.';
comment on table public.spotlight_interactions is 'Per-user, per-workspace Spotlight view, dismissal, and click state used for frequency caps.';
