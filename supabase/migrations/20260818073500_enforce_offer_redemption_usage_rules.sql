-- =============================================================================
-- Offer redemption frequency and eligibility enforcement
-- =============================================================================
-- Keeps one redemption row per use while allowing businesses to choose whether
-- an offer is single-use or reusable. The database remains the authority so a
-- handcrafted client request cannot bypass offer/pass/environment rules.
-- =============================================================================

alter table public.offers
  drop constraint if exists offers_usage_rule_check;

alter table public.offers
  add constraint offers_usage_rule_check
  check (usage_rule in ('one-time', 'daily', 'weekly', 'unlimited'));

create index if not exists redemptions_offer_user_created_at_idx
  on public.redemptions (offer_id, user_id, created_at desc);

create or replace function public.enforce_redemption_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request_role text := coalesce(auth.jwt() ->> 'role', '');
  v_actor_id uuid := auth.uid();
  v_actor_is_demo boolean;
  v_actor_demo_group text;
  v_offer_is_demo boolean;
  v_offer_demo_group text;
  v_offer_usage_rule text;
  v_offer_is_active boolean;
  v_offer_starts_at timestamptz;
  v_offer_ends_at timestamptz;
  v_offer_business_profile_id uuid;
  v_last_redeemed_at timestamptz;
  v_scope text;
  v_subject_hash text;
  v_decision record;
begin
  -- Internal service-role maintenance/demo tools retain their existing bypass.
  if v_request_role = 'service_role' then
    return new;
  end if;

  if v_actor_id is null or new.user_id is distinct from v_actor_id then
    raise exception 'redemption requires the authenticated user identity';
  end if;

  select p.is_demo, p.demo_group
  into v_actor_is_demo, v_actor_demo_group
  from public.profiles p
  where p.id = v_actor_id;

  if not found then
    raise exception 'redemption customer profile does not exist';
  end if;

  select
    o.is_demo,
    o.demo_group,
    o.usage_rule,
    o.is_active,
    o.starts_at,
    o.ends_at,
    o.business_id
  into
    v_offer_is_demo,
    v_offer_demo_group,
    v_offer_usage_rule,
    v_offer_is_active,
    v_offer_starts_at,
    v_offer_ends_at,
    v_offer_business_profile_id
  from public.offers o
  where o.id = new.offer_id;

  if not found then
    raise exception 'redemption offer does not exist';
  end if;

  if coalesce(v_actor_is_demo, false) is distinct from coalesce(v_offer_is_demo, false)
     or (coalesce(v_offer_is_demo, false) and v_actor_demo_group is distinct from v_offer_demo_group) then
    raise exception 'redemption environment does not match customer';
  end if;

  if v_offer_is_active is distinct from true then
    raise exception 'offer is paused or unavailable';
  end if;

  if v_offer_starts_at is not null and v_offer_starts_at > now() then
    raise exception 'offer is not active yet';
  end if;

  if v_offer_ends_at is not null and v_offer_ends_at < now() then
    raise exception 'offer has expired';
  end if;

  -- If this legacy profile has a canonical business workspace, that workspace
  -- must be active. Legacy offers without a canonical workspace remain usable
  -- for backwards compatibility until migration to canonical workspaces.
  if exists (
    select 1
    from public.businesses b
    where b.legacy_profile_id = v_offer_business_profile_id
  ) and not exists (
    select 1
    from public.businesses b
    where b.legacy_profile_id = v_offer_business_profile_id
      and b.status = 'active'
      and coalesce(b.is_demo, false) is not distinct from coalesce(v_offer_is_demo, false)
      and (
        coalesce(v_offer_is_demo, false) = false
        or b.demo_group is not distinct from v_offer_demo_group
      )
  ) then
    raise exception 'business is paused or unavailable';
  end if;

  if not exists (
    select 1
    from public.customer_entitlements e
    where e.user_id = v_actor_id
      and e.status = 'active'
      and e.starts_at <= now()
      and (e.expires_at is null or e.expires_at > now())
      and coalesce(e.is_demo, false) is not distinct from coalesce(v_offer_is_demo, false)
      and (
        coalesce(v_offer_is_demo, false) = false
        or e.demo_group is not distinct from v_offer_demo_group
      )
  ) then
    raise exception 'an active RaiseHub Pass is required to redeem this offer';
  end if;

  select max(r.created_at)
  into v_last_redeemed_at
  from public.redemptions r
  where r.offer_id = new.offer_id
    and r.user_id = v_actor_id;

  case coalesce(v_offer_usage_rule, 'one-time')
    when 'one-time' then
      if v_last_redeemed_at is not null then
        raise exception 'single-use offer has already been redeemed';
      end if;
    when 'daily' then
      if v_last_redeemed_at is not null
         and v_last_redeemed_at > now() - interval '24 hours' then
        raise exception 'offer is available once every 24 hours';
      end if;
    when 'weekly' then
      if v_last_redeemed_at is not null
         and v_last_redeemed_at > now() - interval '7 days' then
        raise exception 'offer is available once every 7 days';
      end if;
    when 'unlimited' then
      null;
    else
      raise exception 'offer has an unsupported redemption rule';
  end case;

  new.is_demo := coalesce(v_offer_is_demo, false);
  new.demo_group := case
    when coalesce(v_offer_is_demo, false) then v_offer_demo_group
    else null
  end;

  v_scope := case
    when coalesce(v_offer_is_demo, false)
      then 'offer_redemption:create:demo:' || coalesce(v_offer_demo_group, 'missing')
    else 'offer_redemption:create:live'
  end;

  v_subject_hash := md5(v_scope || ':' || v_actor_id::text);

  select * into v_decision
  from public.consume_rate_limit(v_scope, v_subject_hash, 5, 60);

  if v_decision.allowed is distinct from true then
    raise exception 'redemption rate limit exceeded; retry after % seconds',
      greatest(coalesce(v_decision.retry_after_seconds, 1), 1);
  end if;

  return new;
end;
$$;

comment on column public.offers.usage_rule is
  'Redemption frequency: one-time, daily (rolling 24h), weekly (rolling 7d), or unlimited.';
