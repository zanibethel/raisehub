create index if not exists offer_reward_score_snapshots_reward_period_idx
  on public.offer_reward_score_snapshots (reward_period_id);

create index if not exists partner_point_events_offer_idx
  on public.partner_point_events (offer_id)
  where offer_id is not null;

create index if not exists partner_point_events_reversal_idx
  on public.partner_point_events (reversal_of_event_id)
  where reversal_of_event_id is not null;

create index if not exists partner_reward_checkpoints_reward_period_idx
  on public.partner_reward_checkpoints (reward_period_id);
