-- =============================================================================
-- Add the initial demo platform pricing default
-- =============================================================================
-- Production and demo pricing resolve independently. The original pricing
-- foundation seeded only the production platform rule, so demo campaigns fell
-- back to the emergency application default.
--
-- This creates the corresponding owner-managed demo rule without changing
-- production pricing or rewriting immutable purchase history.

insert into public.pricing_rules (
  scope_type,
  pass_price,
  platform_fee_percent,
  status,
  starts_at,
  reason,
  internal_note,
  is_demo,
  demo_group
)
select
  'platform',
  20.00,
  20.00,
  'active',
  now(),
  'Initial RaiseHub demo platform default',
  'Keeps demo checkout on managed pricing instead of the emergency application fallback.',
  true,
  null
where not exists (
  select 1
  from public.pricing_rules
  where scope_type = 'platform'
    and is_demo = true
    and status = 'active'
    and starts_at <= now()
    and (
      expires_at is null
      or expires_at > now()
    )
);
