-- =============================================================================
-- RaiseHub configurable pricing rules
-- =============================================================================
-- Resolution order:
--   campaign -> organization -> town -> state -> platform
--
-- Multiple scheduled rules may exist for the same target. The effective-pricing
-- resolver will select the currently active rule with the newest starts_at,
-- followed by created_at as a deterministic tie-breaker.

create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),

  scope_type text not null
    check (
      scope_type in (
        'platform',
        'state',
        'town',
        'organization',
        'campaign'
      )
    ),

  state_code text,
  town_name text,
  organization_id uuid
    references public.organizations(id)
    on delete cascade,
  campaign_id uuid
    references public.campaigns(id)
    on delete cascade,

  pass_price numeric(10, 2) not null
    check (pass_price > 0 and pass_price <= 1000),

  platform_fee_percent numeric(5, 2) not null
    check (
      platform_fee_percent >= 0
      and platform_fee_percent <= 100
    ),

  status text not null default 'active'
    check (status in ('active', 'inactive')),

  starts_at timestamptz not null default now(),
  expires_at timestamptz,

  reason text,
  internal_note text,

  created_by uuid
    references public.profiles(id)
    on delete set null,
  updated_by uuid
    references public.profiles(id)
    on delete set null,

  is_demo boolean not null default false,
  demo_group text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pricing_rules_valid_window
    check (
      expires_at is null
      or expires_at > starts_at
    ),

  constraint pricing_rules_demo_group_consistency
    check (
      is_demo = true
      or demo_group is null
    ),

  constraint pricing_rules_scope_target_consistency
    check (
      (
        scope_type = 'platform'
        and state_code is null
        and town_name is null
        and organization_id is null
        and campaign_id is null
      )
      or
      (
        scope_type = 'state'
        and state_code is not null
        and town_name is null
        and organization_id is null
        and campaign_id is null
      )
      or
      (
        scope_type = 'town'
        and state_code is not null
        and town_name is not null
        and organization_id is null
        and campaign_id is null
      )
      or
      (
        scope_type = 'organization'
        and state_code is null
        and town_name is null
        and organization_id is not null
        and campaign_id is null
      )
      or
      (
        scope_type = 'campaign'
        and state_code is null
        and town_name is null
        and organization_id is null
        and campaign_id is not null
      )
    ),

  constraint pricing_rules_state_code_format
    check (
      state_code is null
      or state_code ~ '^[A-Z]{2}$'
    ),

  constraint pricing_rules_town_name_not_blank
    check (
      town_name is null
      or length(btrim(town_name)) > 0
    )
);

comment on table public.pricing_rules is
  'Owner-managed pass pricing and platform-fee rules resolved from campaign through platform scope.';

comment on column public.pricing_rules.reason is
  'Short owner-facing explanation for why the pricing rule exists.';

comment on column public.pricing_rules.internal_note is
  'Private operational note visible only to authorized owner tools.';

-- =============================================================================
-- Resolution indexes
-- =============================================================================

create index if not exists pricing_rules_platform_resolution_idx
  on public.pricing_rules (
    is_demo,
    status,
    starts_at desc,
    created_at desc
  )
  where scope_type = 'platform';

create index if not exists pricing_rules_state_resolution_idx
  on public.pricing_rules (
    state_code,
    is_demo,
    status,
    starts_at desc,
    created_at desc
  )
  where scope_type = 'state';

create index if not exists pricing_rules_town_resolution_idx
  on public.pricing_rules (
    state_code,
    lower(town_name),
    is_demo,
    status,
    starts_at desc,
    created_at desc
  )
  where scope_type = 'town';

create index if not exists pricing_rules_organization_resolution_idx
  on public.pricing_rules (
    organization_id,
    is_demo,
    status,
    starts_at desc,
    created_at desc
  )
  where scope_type = 'organization';

create index if not exists pricing_rules_campaign_resolution_idx
  on public.pricing_rules (
    campaign_id,
    is_demo,
    status,
    starts_at desc,
    created_at desc
  )
  where scope_type = 'campaign';

create index if not exists pricing_rules_expiration_idx
  on public.pricing_rules (expires_at)
  where expires_at is not null;

-- =============================================================================
-- Updated-at maintenance
-- =============================================================================

create or replace function public.set_pricing_rule_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_pricing_rule_updated_at
  on public.pricing_rules;

create trigger set_pricing_rule_updated_at
before update on public.pricing_rules
for each row
execute function public.set_pricing_rule_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.pricing_rules enable row level security;

drop policy if exists "Owners can view pricing rules"
  on public.pricing_rules;

create policy "Owners can view pricing rules"
on public.pricing_rules
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'owner'
  )
);

drop policy if exists "Owners can create pricing rules"
  on public.pricing_rules;

create policy "Owners can create pricing rules"
on public.pricing_rules
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'owner'
  )
  and (
    created_by is null
    or created_by = auth.uid()
  )
  and (
    updated_by is null
    or updated_by = auth.uid()
  )
);

drop policy if exists "Owners can update pricing rules"
  on public.pricing_rules;

create policy "Owners can update pricing rules"
on public.pricing_rules
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'owner'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'owner'
  )
  and (
    updated_by is null
    or updated_by = auth.uid()
  )
);

drop policy if exists "Owners can delete pricing rules"
  on public.pricing_rules;

create policy "Owners can delete pricing rules"
on public.pricing_rules
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'owner'
  )
);

-- =============================================================================
-- Initial platform default
-- =============================================================================

insert into public.pricing_rules (
  scope_type,
  pass_price,
  platform_fee_percent,
  status,
  starts_at,
  reason
)
select
  'platform',
  20.00,
  20.00,
  'active',
  now(),
  'Initial RaiseHub platform default'
where not exists (
  select 1
  from public.pricing_rules
  where scope_type = 'platform'
    and is_demo = false
);
