-- Website Builder rewards in the existing Partner Rewards Marketplace.
-- The core RaiseHub-hosted website remains free. Points are only spent on
-- optional enhancements so newer businesses are never blocked from publishing.

insert into public.partner_reward_marketplace_items
  (code, name, description, category, point_cost, duration_days, benefit_config, is_active, sort_order)
values
  (
    'website_branding_free_90d',
    'Branding-Free Website',
    'Hide the Powered by RaiseHub label on your published business website for 90 days.',
    'premium_feature',
    300,
    90,
    '{"website_feature":"branding_free","hide_raisehub_branding":true}'::jsonb,
    true,
    40
  ),
  (
    'website_ai_copy_refresh',
    'AI Website Copy Refresh',
    'Use Partner Points for an AI-assisted rewrite of your business website copy once this tool launches.',
    'premium_feature',
    150,
    null,
    '{"website_feature":"ai_copy_refresh"}'::jsonb,
    false,
    50
  ),
  (
    'website_analytics_plus_30d',
    'Website Analytics Plus',
    'Unlock enhanced website traffic and engagement insights for 30 days once analytics upgrades launch.',
    'premium_feature',
    200,
    30,
    '{"website_feature":"analytics_plus"}'::jsonb,
    false,
    60
  ),
  (
    'featured_business_site_7d',
    'Featured Business Website',
    'Feature your published business website in RaiseHub discovery surfaces for 7 days once featured placement launches.',
    'promotion',
    350,
    7,
    '{"website_feature":"featured_site","promotion_type":"featured_business_site"}'::jsonb,
    false,
    70
  )
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  point_cost = excluded.point_cost,
  duration_days = excluded.duration_days,
  benefit_config = excluded.benefit_config,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();
