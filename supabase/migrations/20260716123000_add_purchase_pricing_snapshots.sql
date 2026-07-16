-- =============================================================================
-- Preserve effective pricing on each campaign purchase
-- =============================================================================
-- Existing purchases remain valid with null snapshot fields. New purchase flows
-- will populate these columns when they adopt the pricing-resolution service.

alter table public.campaign_purchases
  add column if not exists pricing_rule_id uuid
    references public.pricing_rules(id)
    on delete set null,

  add column if not exists pricing_scope text,

  add column if not exists pass_price_charged numeric(10, 2),

  add column if not exists platform_fee_percent numeric(5, 2),

  add column if not exists organization_pass_earnings numeric(10, 2),

  add column if not exists pricing_resolved_at timestamptz;

-- =============================================================================
-- Snapshot validation
-- =============================================================================

alter table public.campaign_purchases
  drop constraint if exists campaign_purchases_pricing_scope_check;

alter table public.campaign_purchases
  add constraint campaign_purchases_pricing_scope_check
  check (
    pricing_scope is null
    or pricing_scope in (
      'platform',
      'state',
      'town',
      'organization',
      'campaign',
      'fallback'
    )
  );

alter table public.campaign_purchases
  drop constraint if exists campaign_purchases_pass_price_charged_check;

alter table public.campaign_purchases
  add constraint campaign_purchases_pass_price_charged_check
  check (
    pass_price_charged is null
    or (
      pass_price_charged > 0
      and pass_price_charged <= 1000
    )
  );

alter table public.campaign_purchases
  drop constraint if exists campaign_purchases_platform_fee_percent_check;

alter table public.campaign_purchases
  add constraint campaign_purchases_platform_fee_percent_check
  check (
    platform_fee_percent is null
    or (
      platform_fee_percent >= 0
      and platform_fee_percent <= 100
    )
  );

alter table public.campaign_purchases
  drop constraint if exists campaign_purchases_organization_pass_earnings_check;

alter table public.campaign_purchases
  add constraint campaign_purchases_organization_pass_earnings_check
  check (
    organization_pass_earnings is null
    or organization_pass_earnings >= 0
  );

alter table public.campaign_purchases
  drop constraint if exists campaign_purchases_pricing_snapshot_consistency;

alter table public.campaign_purchases
  add constraint campaign_purchases_pricing_snapshot_consistency
  check (
    (
      pricing_scope is null
      and pass_price_charged is null
      and platform_fee_percent is null
      and organization_pass_earnings is null
      and pricing_resolved_at is null
    )
    or
    (
      pricing_scope is not null
      and pass_price_charged is not null
      and platform_fee_percent is not null
      and organization_pass_earnings is not null
      and pricing_resolved_at is not null
    )
  );

-- =============================================================================
-- Audit and lookup support
-- =============================================================================

create index if not exists campaign_purchases_pricing_rule_idx
  on public.campaign_purchases (pricing_rule_id)
  where pricing_rule_id is not null;

create index if not exists campaign_purchases_pricing_scope_idx
  on public.campaign_purchases (
    pricing_scope,
    pricing_resolved_at desc
  )
  where pricing_scope is not null;

comment on column public.campaign_purchases.pricing_rule_id is
  'Pricing rule selected at checkout. Financial snapshot values remain authoritative if the rule later changes or is deleted.';

comment on column public.campaign_purchases.pricing_scope is
  'Winning pricing scope selected at checkout: campaign, organization, town, state, platform, or emergency fallback.';

comment on column public.campaign_purchases.pass_price_charged is
  'Pass price charged before any optional donation.';

comment on column public.campaign_purchases.platform_fee_percent is
  'RaiseHub fee percentage applied to the pass price at checkout.';

comment on column public.campaign_purchases.organization_pass_earnings is
  'Organization share of the pass price before optional donation.';

comment on column public.campaign_purchases.pricing_resolved_at is
  'Timestamp when effective pricing was resolved for this purchase.';
