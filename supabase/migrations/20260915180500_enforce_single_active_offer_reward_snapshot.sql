-- Ensure each offer has at most one active Partner Rewards score snapshot per reward period.
-- Existing duplicate active snapshots are reduced to the earliest-created row.

with ranked as (
  select
    id,
    row_number() over (
      partition by offer_id, reward_period_id
      order by created_at asc, id asc
    ) as rn
  from public.offer_reward_score_snapshots
  where effective_to is null
)
delete from public.offer_reward_score_snapshots s
using ranked r
where s.id = r.id
  and r.rn > 1;

create unique index if not exists offer_reward_score_snapshots_one_active_per_offer_period_idx
  on public.offer_reward_score_snapshots (offer_id, reward_period_id)
  where effective_to is null;
