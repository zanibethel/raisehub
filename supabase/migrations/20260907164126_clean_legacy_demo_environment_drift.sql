-- Repair legacy child rows that were classified as production even though
-- their authoritative parent workspace/content is demo.
--
-- Preserve child-specific demo_group values where present because curated QA
-- scenarios intentionally layer groups such as attention_center_test and
-- stripe_qa_seed on top of broader demo workspaces.

update public.offers o
set
  is_demo = true,
  demo_group = coalesce(o.demo_group, p.demo_group)
from public.profiles p
where o.business_id = p.id
  and p.is_demo = true
  and o.is_demo = false;

update public.campaigns c
set
  is_demo = true,
  demo_group = coalesce(c.demo_group, org.demo_group)
from public.organizations org
where c.organization_id = org.id
  and org.is_demo = true
  and c.is_demo = false;

update public.campaign_purchases cp
set
  is_demo = true,
  demo_group = coalesce(cp.demo_group, c.demo_group)
from public.campaigns c
where cp.campaign_id = c.id
  and c.is_demo = true
  and cp.is_demo = false;

update public.redemptions r
set
  is_demo = true,
  demo_group = coalesce(r.demo_group, o.demo_group)
from public.offers o
where r.offer_id = o.id
  and o.is_demo = true
  and r.is_demo = false;
