-- Fix PL/pgSQL output-column ambiguity in redemption RPCs discovered during end-to-end QA.
-- Qualify redemption_claims/redemptions columns so returned table fields such as
-- status, expires_at, confirmed_at, and redemption_id cannot shadow table columns.

create or replace function public.create_redemption_claim(p_offer_id uuid)
returns table(
  claim_id uuid,
  confirmation_code text,
  expires_at timestamptz,
  status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_is_demo boolean;
  v_user_demo_group text;
  v_offer record;
  v_last_redeemed_at timestamptz;
  v_existing record;
  v_code text;
  v_claim_id uuid;
  v_redemption_id uuid;
  v_expires_at timestamptz;
  v_auto_confirm_at timestamptz;
  v_attempt integer := 0;
begin
  perform public.finalize_due_redemptions();

  if v_user_id is null then
    raise exception 'you must be logged in to redeem this offer';
  end if;

  select p.is_demo, p.demo_group
  into v_user_is_demo, v_user_demo_group
  from public.profiles p
  where p.id = v_user_id;

  if not found then
    raise exception 'redemption customer profile does not exist';
  end if;

  select o.id, o.business_id, o.usage_rule, o.is_active, o.starts_at, o.ends_at,
         o.is_demo, o.demo_group, o.title, o.discount, o.customer_value
  into v_offer
  from public.offers o
  where o.id = p_offer_id;

  if not found then
    raise exception 'redemption offer does not exist';
  end if;

  if coalesce(v_user_is_demo, false) is distinct from coalesce(v_offer.is_demo, false)
     or (coalesce(v_offer.is_demo, false) and v_user_demo_group is distinct from v_offer.demo_group) then
    raise exception 'redemption environment does not match customer';
  end if;

  if v_offer.is_active is distinct from true then
    raise exception 'offer is paused or unavailable';
  end if;
  if v_offer.starts_at is not null and v_offer.starts_at > now() then
    raise exception 'offer is not active yet';
  end if;
  if v_offer.ends_at is not null and v_offer.ends_at < now() then
    raise exception 'offer has expired';
  end if;

  if exists (
    select 1 from public.businesses b where b.legacy_profile_id = v_offer.business_id
  ) and not exists (
    select 1
    from public.businesses b
    where b.legacy_profile_id = v_offer.business_id
      and b.status = 'active'
      and coalesce(b.is_demo, false) is not distinct from coalesce(v_offer.is_demo, false)
      and (coalesce(v_offer.is_demo, false) = false or b.demo_group is not distinct from v_offer.demo_group)
  ) then
    raise exception 'business is paused or unavailable';
  end if;

  if not exists (
    select 1
    from public.customer_entitlements e
    where e.user_id = v_user_id
      and e.status = 'active'
      and e.starts_at <= now()
      and (e.expires_at is null or e.expires_at > now())
      and coalesce(e.is_demo, false) is not distinct from coalesce(v_offer.is_demo, false)
      and (coalesce(v_offer.is_demo, false) = false or e.demo_group is not distinct from v_offer.demo_group)
  ) then
    raise exception 'an active RaiseHub Pass is required to redeem this offer';
  end if;

  select max(r.created_at)
  into v_last_redeemed_at
  from public.redemptions r
  where r.offer_id = p_offer_id
    and r.user_id = v_user_id
    and r.status in ('pending','confirmed');

  case coalesce(v_offer.usage_rule, 'one-time')
    when 'one-time' then
      if v_last_redeemed_at is not null then
        raise exception 'single-use offer has already been redeemed';
      end if;
    when 'daily' then
      if v_last_redeemed_at is not null and v_last_redeemed_at > now() - interval '24 hours' then
        raise exception 'offer is available once every 24 hours';
      end if;
    when 'weekly' then
      if v_last_redeemed_at is not null and v_last_redeemed_at > now() - interval '7 days' then
        raise exception 'offer is available once every 7 days';
      end if;
    when 'unlimited' then null;
    else raise exception 'offer has an unsupported redemption rule';
  end case;

  update public.redemption_claims as rc
  set status = 'expired'
  where rc.user_id = v_user_id
    and rc.offer_id = p_offer_id
    and rc.status = 'pending'
    and rc.expires_at <= now();

  select rc.id, rc.confirmation_code, rc.expires_at, rc.status
  into v_existing
  from public.redemption_claims rc
  join public.redemptions r on r.id = rc.redemption_id
  where rc.user_id = v_user_id
    and rc.offer_id = p_offer_id
    and rc.status = 'pending'
    and rc.expires_at > now()
    and r.status = 'pending'
  order by rc.created_at desc
  limit 1;

  if found then
    return query select v_existing.id, v_existing.confirmation_code, v_existing.expires_at, v_existing.status;
    return;
  end if;

  v_expires_at := now() + interval '5 minutes';
  v_auto_confirm_at := now() + interval '24 hours';

  insert into public.redemptions (
    offer_id, user_id, business_profile_id, is_demo, demo_group,
    confirmation_method, confirmed_by, offer_title_snapshot, benefit_snapshot,
    customer_value_snapshot, usage_rule_snapshot, status, auto_confirm_at, confirmed_at
  ) values (
    p_offer_id, v_user_id, v_offer.business_id,
    coalesce(v_offer.is_demo, false),
    case when coalesce(v_offer.is_demo, false) then v_offer.demo_group else null end,
    'auto_validation', null, v_offer.title, v_offer.discount,
    v_offer.customer_value, v_offer.usage_rule, 'pending', v_auto_confirm_at, null
  ) returning id into v_redemption_id;

  loop
    v_attempt := v_attempt + 1;
    v_code := substr(upper(replace(gen_random_uuid()::text, '-', '')), 1, 6);
    begin
      insert into public.redemption_claims (
        offer_id, user_id, business_profile_id, confirmation_code,
        status, expires_at, is_demo, demo_group, redemption_id
      ) values (
        p_offer_id, v_user_id, v_offer.business_id, v_code,
        'pending', v_expires_at, coalesce(v_offer.is_demo, false),
        case when coalesce(v_offer.is_demo, false) then v_offer.demo_group else null end,
        v_redemption_id
      ) returning id into v_claim_id;
      exit;
    exception when unique_violation then
      if v_attempt >= 5 then
        raise exception 'could not create a unique redemption code; please try again';
      end if;
    end;
  end loop;

  return query select v_claim_id, v_code, v_expires_at, 'pending'::text;
end;
$$;

create or replace function public.get_redemption_claim_status(p_claim_id uuid)
returns table(
  status text,
  expires_at timestamptz,
  confirmed_at timestamptz,
  redemption_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'you must be logged in';
  end if;

  perform public.finalize_due_redemptions();

  update public.redemption_claims as rc
  set status = case
        when r.status = 'confirmed' then 'confirmed'
        when r.status in ('rejected','voided') then 'cancelled'
        else rc.status
      end,
      confirmed_at = case when r.status = 'confirmed' then coalesce(rc.confirmed_at, r.confirmed_at) else rc.confirmed_at end
  from public.redemptions r
  where rc.id = p_claim_id
    and rc.user_id = v_user_id
    and rc.redemption_id = r.id
    and rc.status = 'pending'
    and r.status <> 'pending';

  update public.redemption_claims as rc
  set status = 'expired'
  where rc.id = p_claim_id
    and rc.user_id = v_user_id
    and rc.status = 'pending'
    and rc.expires_at <= now();

  return query
  select rc.status, rc.expires_at, rc.confirmed_at, rc.redemption_id
  from public.redemption_claims rc
  where rc.id = p_claim_id and rc.user_id = v_user_id;
end;
$$;

create or replace function public.confirm_redemption_claim(p_confirmation_code text)
returns table(
  claim_id uuid,
  redemption_id uuid,
  offer_id uuid,
  customer_user_id uuid,
  confirmed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_claim record;
  v_offer record;
  v_redemption_id uuid;
  v_confirmed_at timestamptz := now();
  v_actor_is_demo boolean;
  v_actor_demo_group text;
begin
  perform public.finalize_due_redemptions();

  if v_actor_id is null then
    raise exception 'business staff must be logged in';
  end if;

  select p.is_demo, p.demo_group
  into v_actor_is_demo, v_actor_demo_group
  from public.profiles p
  where p.id = v_actor_id;

  select rc.id, rc.offer_id, rc.user_id, rc.business_profile_id, rc.status,
         rc.expires_at, rc.is_demo, rc.demo_group, rc.redemption_id
  into v_claim
  from public.redemption_claims rc
  where rc.confirmation_code = upper(trim(p_confirmation_code))
  for update;

  if not found then
    raise exception 'redemption code was not found';
  end if;

  if v_claim.status = 'confirmed' then
    return query
    select rc.id, rc.redemption_id, rc.offer_id, rc.user_id, coalesce(rc.confirmed_at, r.confirmed_at)
    from public.redemption_claims rc
    left join public.redemptions r on r.id = rc.redemption_id
    where rc.id = v_claim.id;
    return;
  end if;

  if v_claim.status <> 'pending' or v_claim.expires_at <= now() then
    if v_claim.status = 'pending' then
      update public.redemption_claims as rc
      set status = 'expired'
      where rc.id = v_claim.id;
    end if;
    raise exception 'redemption code has expired';
  end if;

  if not (
    v_claim.business_profile_id = v_actor_id
    or exists (
      select 1
      from public.businesses b
      left join public.business_memberships bm
        on bm.business_id = b.id
       and bm.user_id = v_actor_id
       and bm.status = 'active'
      where b.legacy_profile_id = v_claim.business_profile_id
        and (b.created_by = v_actor_id or bm.id is not null)
    )
  ) then
    raise exception 'this redemption belongs to a different business';
  end if;

  if coalesce(v_actor_is_demo, false) is distinct from coalesce(v_claim.is_demo, false)
     or (coalesce(v_claim.is_demo, false) and v_actor_demo_group is distinct from v_claim.demo_group) then
    raise exception 'redemption environment does not match business staff';
  end if;

  if v_claim.redemption_id is not null then
    select r.status into v_offer
    from public.redemptions r
    where r.id = v_claim.redemption_id
    for update;

    if not found then
      raise exception 'redemption record does not exist';
    end if;

    if v_offer.status in ('rejected','voided') then
      raise exception 'this redemption is no longer eligible for confirmation';
    end if;

    update public.redemptions as r
    set status = 'confirmed',
        confirmed_at = coalesce(r.confirmed_at, v_confirmed_at),
        confirmed_by = v_actor_id,
        confirmation_method = 'staff_confirmation'
    where r.id = v_claim.redemption_id
      and r.status = 'pending';

    v_redemption_id := v_claim.redemption_id;
  else
    select o.title, o.discount, o.customer_value, o.usage_rule, o.business_id
    into v_offer
    from public.offers o
    where o.id = v_claim.offer_id;

    if not found then
      raise exception 'redemption offer does not exist';
    end if;

    insert into public.redemptions (
      offer_id, user_id, business_profile_id, is_demo, demo_group,
      confirmation_method, confirmed_by, offer_title_snapshot, benefit_snapshot,
      customer_value_snapshot, usage_rule_snapshot, status, confirmed_at
    ) values (
      v_claim.offer_id, v_claim.user_id, v_offer.business_id,
      coalesce(v_claim.is_demo, false),
      case when coalesce(v_claim.is_demo, false) then v_claim.demo_group else null end,
      'staff_confirmation', v_actor_id, v_offer.title, v_offer.discount,
      v_offer.customer_value, v_offer.usage_rule, 'confirmed', v_confirmed_at
    ) returning id into v_redemption_id;
  end if;

  update public.redemption_claims as rc
  set status = 'confirmed',
      confirmed_at = v_confirmed_at,
      confirmed_by = v_actor_id,
      redemption_id = v_redemption_id
  where rc.id = v_claim.id;

  return query select v_claim.id, v_redemption_id, v_claim.offer_id, v_claim.user_id, v_confirmed_at;
end;
$$;

revoke all on function public.create_redemption_claim(uuid) from public;
grant execute on function public.create_redemption_claim(uuid) to authenticated;
revoke all on function public.get_redemption_claim_status(uuid) from public;
grant execute on function public.get_redemption_claim_status(uuid) to authenticated;
revoke all on function public.confirm_redemption_claim(text) from public;
grant execute on function public.confirm_redemption_claim(text) to authenticated;
