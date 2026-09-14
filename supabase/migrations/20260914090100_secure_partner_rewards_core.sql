alter table public.partner_reward_periods enable row level security;
alter table public.offer_reward_score_snapshots enable row level security;
alter table public.partner_point_events enable row level security;
alter table public.partner_reward_checkpoints enable row level security;

revoke select, insert, update, delete on public.partner_reward_periods from anon;
revoke select, insert, update, delete on public.offer_reward_score_snapshots from anon;
revoke select, insert, update, delete on public.partner_point_events from anon;
revoke select, insert, update, delete on public.partner_reward_checkpoints from anon;

revoke insert, update, delete on public.partner_reward_periods from authenticated;
revoke insert, update, delete on public.offer_reward_score_snapshots from authenticated;
revoke insert, update, delete on public.partner_point_events from authenticated;
revoke insert, update, delete on public.partner_reward_checkpoints from authenticated;

grant select on public.partner_reward_periods to authenticated;
grant select on public.offer_reward_score_snapshots to authenticated;
grant select on public.partner_point_events to authenticated;
grant select on public.partner_reward_checkpoints to authenticated;
