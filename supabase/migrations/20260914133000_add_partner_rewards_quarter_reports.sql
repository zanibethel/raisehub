-- =============================================================================
-- Quarterly Partner Rewards reporting
-- Reporting windows are Central Time and stored as absolute timestamptz values.
-- End timestamps are exclusive (next quarter local midnight).
-- =============================================================================

-- Correct the seeded Q3 2026 period to Central Time boundaries.
-- July/October 2026 are both in CDT (UTC-05:00).
update public.partner_reward_periods
set
  starts_at = '2026-07-01 05:00:00+00',
  ends_at = '2026-10-01 05:00:00+00'
where label = '2026 Q3'
  and status = 'open';

create table if not exists public.partner_reward_quarter_reports (
  id uuid primary key default gen_random_uuid(),
  reward_period_id uuid not null references public.partner_reward_periods(id) on delete restrict,
  is_demo boolean not null default false,
  demo_group text,
  report_status text not null default 'running',
  timezone text not null default 'America/Chicago',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  qualifying_sales_cents bigint not null default 0,
  gross_paid_cents bigint not null default 0,
  refunds_cents bigint not null default 0,
  platform_allocation_cents bigint not null default 0,
  platform_retained_cents bigint not null default 0,
  partner_rewards_pool_cents bigint not null default 0,
  eligible_points numeric not null default 0,
  pending_points numeric not null default 0,
  businesses_with_eligible_points integer not null default 0,
  expected_disbursement_cents bigint not null default 0,
  payout_ready_cents bigint not null default 0,
  payout_blocked_cents bigint not null default 0,
  last_refreshed_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_reward_quarter_reports_status_valid
    check (report_status in ('running', 'finalizing', 'finalized', 'paid')),
  constraint partner_reward_quarter_reports_demo_scope_valid
    check ((is_demo = false and demo_group is null) or (is_demo = true and demo_group is not null)),
  constraint partner_reward_quarter_reports_window_valid
    check (ends_at > starts_at),
  constraint partner_reward_quarter_reports_amounts_nonnegative
    check (
      qualifying_sales_cents >= 0 and
      gross_paid_cents >= 0 and
      refunds_cents >= 0 and
      platform_allocation_cents >= 0 and
      platform_retained_cents >= 0 and
      partner_rewards_pool_cents >= 0 and
      expected_disbursement_cents >= 0 and
      payout_ready_cents >= 0 and
      payout_blocked_cents >= 0
    )
);

create unique index if not exists partner_reward_quarter_reports_scope_unique_idx
  on public.partner_reward_quarter_reports (
    reward_period_id,
    is_demo,
    coalesce(demo_group, '')
  );

create index if not exists partner_reward_quarter_reports_status_idx
  on public.partner_reward_quarter_reports (report_status, starts_at desc);

create table if not exists public.partner_reward_quarter_business_rows (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.partner_reward_quarter_reports(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete restrict,
  eligible_points numeric not null default 0,
  pending_points numeric not null default 0,
  share_fraction numeric,
  expected_reward_cents bigint not null default 0,
  verification_status text not null default 'not_applied',
  stripe_payout_ready boolean not null default false,
  payout_status text not null default 'not_ready',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_reward_quarter_business_rows_share_valid
    check (share_fraction is null or (share_fraction >= 0 and share_fraction <= 1)),
  constraint partner_reward_quarter_business_rows_reward_nonnegative
    check (expected_reward_cents >= 0),
  constraint partner_reward_quarter_business_rows_payout_status_valid
    check (payout_status in ('not_ready', 'ready', 'pending_transfer', 'paid', 'failed'))
);

create unique index if not exists partner_reward_quarter_business_rows_unique_idx
  on public.partner_reward_quarter_business_rows (report_id, business_id);

create index if not exists partner_reward_quarter_business_rows_payout_idx
  on public.partner_reward_quarter_business_rows (report_id, payout_status, expected_reward_cents desc);

alter table public.partner_reward_quarter_reports enable row level security;
alter table public.partner_reward_quarter_business_rows enable row level security;

revoke all on table public.partner_reward_quarter_reports from public, anon, authenticated;
revoke all on table public.partner_reward_quarter_business_rows from public, anon, authenticated;
grant select, insert, update on table public.partner_reward_quarter_reports to service_role;
grant select, insert, update, delete on table public.partner_reward_quarter_business_rows to service_role;

comment on table public.partner_reward_quarter_reports is
  'Running and finalized Partner Rewards quarter reports. Reporting windows use America/Chicago boundaries.';
comment on table public.partner_reward_quarter_business_rows is
  'Per-business expected/final reward rows associated with a quarterly Partner Rewards report.';

create or replace function public.refresh_partner_reward_quarter_report(
  p_reward_period_id uuid,
  p_is_demo boolean default false,
  p_demo_group text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period public.partner_reward_periods%rowtype;
  v_report_id uuid;
  v_gross_paid_cents bigint := 0;
  v_refunds_cents bigint := 0;
  v_qualifying_sales_cents bigint := 0;
  v_eligible_points numeric := 0;
  v_pending_points numeric := 0;
  v_pool_cents bigint := 0;
  v_expected_disbursement_cents bigint := 0;
  v_payout_ready_cents bigint := 0;
  v_payout_blocked_cents bigint := 0;
begin
  if p_is_demo = false and p_demo_group is not null then
    raise exception 'Production reports cannot have a demo group';
  end if;
  if p_is_demo = true and coalesce(trim(p_demo_group), '') = '' then
    raise exception 'Demo reports require a demo group';
  end if;

  select * into v_period
  from public.partner_reward_periods
  where id = p_reward_period_id;

  if not found then
    raise exception 'Reward period not found';
  end if;

  -- "Qualifying sales" is the pass sale portion only; optional donations are excluded.
  -- Recorded refunds reduce the pass-sale portion first, capped at the pass price.
  select
    coalesce(sum(round(amount_paid * 100)), 0)::bigint,
    coalesce(sum(coalesce(refunded_amount_cents, 0)), 0)::bigint,
    coalesce(sum(
      greatest(
        round(coalesce(pass_price_charged, amount_paid - coalesce(donation_amount, 0)) * 100)::bigint
        - least(
            coalesce(refunded_amount_cents, 0)::bigint,
            round(coalesce(pass_price_charged, amount_paid - coalesce(donation_amount, 0)) * 100)::bigint
          ),
        0
      )
    ), 0)::bigint
  into v_gross_paid_cents, v_refunds_cents, v_qualifying_sales_cents
  from public.campaign_purchases
  where payment_status = case when p_is_demo then 'test_paid' else 'paid' end
    and created_at >= v_period.starts_at
    and created_at < v_period.ends_at
    and is_demo = p_is_demo
    and (
      (p_is_demo = false and demo_group is null)
      or
      (p_is_demo = true and demo_group = p_demo_group)
    );

  select
    coalesce(sum(points) filter (where eligibility_status = 'eligible'), 0),
    coalesce(sum(points) filter (where eligibility_status = 'pending'), 0)
  into v_eligible_points, v_pending_points
  from public.partner_point_events
  where reward_period_id = v_period.id
    and is_demo = p_is_demo
    and (
      (p_is_demo = false and demo_group is null)
      or
      (p_is_demo = true and demo_group = p_demo_group)
    );

  -- Partner Rewards allocation model: 20% platform allocation, 15% retained,
  -- 5% directed to the quarterly Partner Rewards Pool.
  v_pool_cents := round(v_qualifying_sales_cents * 0.05)::bigint;

  insert into public.partner_reward_quarter_reports (
    reward_period_id, is_demo, demo_group, report_status, timezone,
    starts_at, ends_at, qualifying_sales_cents, gross_paid_cents, refunds_cents,
    platform_allocation_cents, platform_retained_cents, partner_rewards_pool_cents,
    eligible_points, pending_points, businesses_with_eligible_points,
    expected_disbursement_cents, payout_ready_cents, payout_blocked_cents,
    last_refreshed_at, updated_at
  )
  values (
    v_period.id, p_is_demo, p_demo_group, 'running', 'America/Chicago',
    v_period.starts_at, v_period.ends_at, v_qualifying_sales_cents, v_gross_paid_cents, v_refunds_cents,
    round(v_qualifying_sales_cents * 0.20)::bigint,
    round(v_qualifying_sales_cents * 0.15)::bigint,
    v_pool_cents,
    v_eligible_points, v_pending_points,
    0, 0, 0, 0,
    now(), now()
  )
  on conflict (reward_period_id, is_demo, (coalesce(demo_group, '')))
  do update set
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    qualifying_sales_cents = excluded.qualifying_sales_cents,
    gross_paid_cents = excluded.gross_paid_cents,
    refunds_cents = excluded.refunds_cents,
    platform_allocation_cents = excluded.platform_allocation_cents,
    platform_retained_cents = excluded.platform_retained_cents,
    partner_rewards_pool_cents = excluded.partner_rewards_pool_cents,
    eligible_points = excluded.eligible_points,
    pending_points = excluded.pending_points,
    last_refreshed_at = now(),
    updated_at = now()
  returning id into v_report_id;

  delete from public.partner_reward_quarter_business_rows where report_id = v_report_id;

  insert into public.partner_reward_quarter_business_rows (
    report_id, business_id, eligible_points, pending_points, share_fraction,
    expected_reward_cents, verification_status, stripe_payout_ready, payout_status
  )
  select
    v_report_id,
    b.id,
    coalesce(sum(e.points) filter (where e.eligibility_status = 'eligible'), 0) as eligible_points,
    coalesce(sum(e.points) filter (where e.eligibility_status = 'pending'), 0) as pending_points,
    case
      when v_eligible_points > 0 then
        coalesce(sum(e.points) filter (where e.eligibility_status = 'eligible'), 0) / v_eligible_points
      else null
    end as share_fraction,
    case
      when v_eligible_points > 0 then
        round(
          v_pool_cents
          * (coalesce(sum(e.points) filter (where e.eligibility_status = 'eligible'), 0) / v_eligible_points)
        )::bigint
      else 0
    end as expected_reward_cents,
    coalesce(v.status, 'not_applied') as verification_status,
    coalesce(
      s.onboarding_status = 'enabled'
      and s.details_submitted
      and s.payouts_enabled
      and s.disabled_reason is null
      and jsonb_array_length(coalesce(s.requirements_currently_due, '[]'::jsonb)) = 0,
      false
    ) as stripe_payout_ready,
    case
      when coalesce(
        s.onboarding_status = 'enabled'
        and s.details_submitted
        and s.payouts_enabled
        and s.disabled_reason is null
        and jsonb_array_length(coalesce(s.requirements_currently_due, '[]'::jsonb)) = 0,
        false
      ) then 'ready'
      else 'not_ready'
    end as payout_status
  from public.businesses b
  left join public.partner_point_events e
    on e.business_id = b.id
    and e.reward_period_id = v_period.id
    and e.is_demo = p_is_demo
    and (
      (p_is_demo = false and e.demo_group is null)
      or
      (p_is_demo = true and e.demo_group = p_demo_group)
    )
  left join public.business_verifications v on v.business_id = b.id
  left join public.business_stripe_accounts s on s.business_id = b.id
  where b.status = 'active'
    and b.is_demo = p_is_demo
    and (
      (p_is_demo = false and b.demo_group is null)
      or
      (p_is_demo = true and b.demo_group = p_demo_group)
    )
  group by b.id, v.status, s.onboarding_status, s.details_submitted,
           s.payouts_enabled, s.disabled_reason, s.requirements_currently_due;

  select
    count(*) filter (where eligible_points > 0),
    coalesce(sum(expected_reward_cents), 0),
    coalesce(sum(expected_reward_cents) filter (where payout_status = 'ready'), 0),
    coalesce(sum(expected_reward_cents) filter (where payout_status <> 'ready'), 0)
  into
    v_expected_disbursement_cents,
    v_expected_disbursement_cents,
    v_payout_ready_cents,
    v_payout_blocked_cents
  from public.partner_reward_quarter_business_rows
  where report_id = v_report_id;

  -- Correct businesses_with_eligible_points separately to preserve integer type.
  update public.partner_reward_quarter_reports r
  set
    businesses_with_eligible_points = (
      select count(*)::integer
      from public.partner_reward_quarter_business_rows br
      where br.report_id = v_report_id and br.eligible_points > 0
    ),
    expected_disbursement_cents = (
      select coalesce(sum(br.expected_reward_cents), 0)::bigint
      from public.partner_reward_quarter_business_rows br
      where br.report_id = v_report_id
    ),
    payout_ready_cents = (
      select coalesce(sum(br.expected_reward_cents), 0)::bigint
      from public.partner_reward_quarter_business_rows br
      where br.report_id = v_report_id and br.payout_status = 'ready'
    ),
    payout_blocked_cents = (
      select coalesce(sum(br.expected_reward_cents), 0)::bigint
      from public.partner_reward_quarter_business_rows br
      where br.report_id = v_report_id and br.payout_status <> 'ready'
    ),
    updated_at = now()
  where r.id = v_report_id;

  return v_report_id;
end;
$$;

revoke all on function public.refresh_partner_reward_quarter_report(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.refresh_partner_reward_quarter_report(uuid, boolean, text) to service_role;

comment on function public.refresh_partner_reward_quarter_report(uuid, boolean, text) is
  'Refreshes the running sales, points, expected Partner Rewards pool, per-business expected rewards, and Stripe payout readiness for one reward period/environment.';
