alter table public.partner_point_events
  add column if not exists is_demo boolean not null default false,
  add column if not exists demo_group text null;

update public.partner_point_events ppe
set is_demo = b.is_demo,
    demo_group = b.demo_group
from public.businesses b
where b.id = ppe.business_id;

create index if not exists partner_point_events_environment_period_idx
  on public.partner_point_events (is_demo, demo_group, reward_period_id, eligibility_status);
