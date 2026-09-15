-- =============================================================================
-- Automatically maintain Partner Rewards quarter periods in America/Chicago.
-- =============================================================================

create or replace function public.ensure_current_partner_reward_period()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_local_now timestamp without time zone := timezone('America/Chicago', now());
  v_local_start timestamp without time zone;
  v_local_end timestamp without time zone;
  v_start timestamptz;
  v_end timestamptz;
  v_year integer;
  v_quarter integer;
  v_label text;
  v_period_id uuid;
begin
  v_local_start := date_trunc('quarter', v_local_now);
  v_local_end := v_local_start + interval '3 months';
  v_start := v_local_start at time zone 'America/Chicago';
  v_end := v_local_end at time zone 'America/Chicago';
  v_year := extract(year from v_local_start)::integer;
  v_quarter := extract(quarter from v_local_start)::integer;
  v_label := format('%s Q%s', v_year, v_quarter);

  -- Expired periods move to closing; they are not finalized until the explicit
  -- quarter-close workflow freezes totals and awards.
  update public.partner_reward_periods
  set status = 'closing', updated_at = now()
  where status = 'open'
    and ends_at <= now();

  select id into v_period_id
  from public.partner_reward_periods
  where label = v_label;

  if v_period_id is null then
    insert into public.partner_reward_periods (
      label, starts_at, ends_at, status, rule_version
    ) values (
      v_label, v_start, v_end, 'open', 'partner_rewards_v1'
    )
    returning id into v_period_id;
  else
    update public.partner_reward_periods
    set
      starts_at = v_start,
      ends_at = v_end,
      status = case when status = 'finalized' then status else 'open' end,
      updated_at = now()
    where id = v_period_id
    returning id into v_period_id;
  end if;

  return v_period_id;
end;
$$;

revoke all on function public.ensure_current_partner_reward_period() from public, anon, authenticated;
grant execute on function public.ensure_current_partner_reward_period() to service_role;

comment on function public.ensure_current_partner_reward_period() is
  'Ensures the current Partner Rewards quarter exists using America/Chicago local-midnight boundaries and moves expired open periods to closing.';
