-- Production migration name: fix_partner_reward_redemption_atomicity

create or replace function public.redeem_partner_reward(
  p_business_id uuid, p_item_code text, p_idempotency_key text
)
returns table (
  redemption_id uuid, item_code text, points_spent numeric,
  starts_at timestamptz, ends_at timestamptz, remaining_eligible_points numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_period public.partner_reward_periods%rowtype;
  v_item public.partner_reward_marketplace_items%rowtype;
  v_existing public.partner_reward_redemptions%rowtype;
  v_redemption public.partner_reward_redemptions%rowtype;
  v_event_id uuid;
  v_earned numeric(12,2);
  v_spent numeric(12,2);
  v_available numeric(12,2);
  v_ends_at timestamptz;
begin
  if v_user_id is null then raise exception 'Authentication is required.'; end if;
  if p_business_id is null then raise exception 'A business is required.'; end if;
  if nullif(trim(p_idempotency_key), '') is null then raise exception 'An idempotency key is required.'; end if;

  if not exists (
    select 1
    from public.business_memberships bm
    where bm.business_id = p_business_id
      and bm.user_id = v_user_id
      and bm.status = 'active'
      and bm.membership_role in ('owner','manager')
  ) then
    raise exception 'Business owner or manager access is required.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));

  select *
    into v_existing
  from public.partner_reward_redemptions prr
  where prr.business_id = p_business_id
    and prr.idempotency_key = p_idempotency_key;

  if found then
    select coalesce(sum(ppe.points),0)
      into v_earned
    from public.partner_point_events ppe
    where ppe.business_id = p_business_id
      and ppe.eligibility_status = 'eligible'
      and ppe.event_type <> 'reward_marketplace_redemption';

    select coalesce(sum(prr.points_spent),0)
      into v_spent
    from public.partner_reward_redemptions prr
    where prr.business_id = p_business_id
      and prr.status <> 'reversed';

    v_available := greatest(v_earned - v_spent, 0);

    return query
      select v_existing.id, pri.code, v_existing.points_spent,
             v_existing.starts_at, v_existing.ends_at, v_available
      from public.partner_reward_marketplace_items pri
      where pri.id = v_existing.marketplace_item_id;
    return;
  end if;

  select coalesce(sum(ppe.points),0)
    into v_earned
  from public.partner_point_events ppe
  where ppe.business_id = p_business_id
    and ppe.eligibility_status = 'eligible'
    and ppe.event_type <> 'reward_marketplace_redemption';

  select coalesce(sum(prr.points_spent),0)
    into v_spent
  from public.partner_reward_redemptions prr
  where prr.business_id = p_business_id
    and prr.status <> 'reversed';

  v_available := greatest(v_earned - v_spent, 0);

  select *
    into v_period
  from public.partner_reward_periods prp
  where prp.status = 'open'
    and now() >= prp.starts_at
    and now() < prp.ends_at
  order by prp.starts_at desc
  limit 1
  for update;
  if not found then raise exception 'There is no open Partner Rewards period.'; end if;

  select *
    into v_item
  from public.partner_reward_marketplace_items pri
  where pri.code = p_item_code
    and pri.is_active = true
  for update;
  if not found then raise exception 'This Partner Reward is not currently available.'; end if;

  if v_available < v_item.point_cost then
    raise exception 'Not enough eligible Partner Points.';
  end if;

  v_ends_at := case
    when v_item.duration_days is null then null
    else now() + make_interval(days => v_item.duration_days)
  end;

  insert into public.partner_reward_redemptions (
    business_id,reward_period_id,marketplace_item_id,redeemed_by,points_spent,status,
    starts_at,ends_at,idempotency_key,benefit_snapshot
  ) values (
    p_business_id,v_period.id,v_item.id,v_user_id,v_item.point_cost,'active',
    now(),v_ends_at,p_idempotency_key,
    jsonb_build_object(
      'code',v_item.code,'name',v_item.name,'category',v_item.category,
      'duration_days',v_item.duration_days,'benefit_config',v_item.benefit_config
    )
  )
  returning * into v_redemption;

  insert into public.partner_point_events (
    business_id,reward_period_id,event_type,points,eligibility_status,source_type,source_id,
    rule_version,idempotency_key,metadata
  ) values (
    p_business_id,v_period.id,'reward_marketplace_redemption',-v_item.point_cost,'ineligible',
    'partner_reward_redemption',v_redemption.id::text,v_period.rule_version,
    'marketplace:'||v_redemption.id::text,
    jsonb_build_object(
      'item_code',v_item.code,
      'item_name',v_item.name,
      'lifetime_balance_debit',true
    )
  )
  returning id into v_event_id;

  update public.partner_reward_redemptions
  set point_event_id = v_event_id, updated_at = now()
  where id = v_redemption.id;

  v_available := v_available - v_item.point_cost;

  return query
    select v_redemption.id,v_item.code,v_item.point_cost,
           v_redemption.starts_at,v_redemption.ends_at,v_available;
end;
$$;

revoke all on function public.redeem_partner_reward(uuid,text,text) from public, anon;
grant execute on function public.redeem_partner_reward(uuid,text,text) to authenticated;

comment on function public.redeem_partner_reward(uuid,text,text) is
  'Redeems against the continuous eligible Partner Point balance with per-business transaction serialization and idempotent replay protection.';
