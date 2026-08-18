begin;

create or replace function public.enforce_redemption_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request_role text := coalesce(auth.jwt() ->> 'role', '');
  v_actor_id uuid := auth.uid();
  v_offer_is_demo boolean;
  v_offer_demo_group text;
  v_scope text;
  v_subject_hash text;
  v_decision record;
begin
  -- Internal service-role writes (for trusted demo/admin maintenance) are not
  -- end-user redemption attempts and must not consume customer buckets.
  if v_request_role = 'service_role' then
    return new;
  end if;

  if v_actor_id is null or new.user_id is distinct from v_actor_id then
    raise exception 'redemption requires the authenticated user identity';
  end if;

  select o.is_demo, o.demo_group
  into v_offer_is_demo, v_offer_demo_group
  from public.offers o
  where o.id = new.offer_id;

  if not found then
    raise exception 'redemption offer does not exist';
  end if;

  -- Derive environment classification from the authoritative offer instead of
  -- trusting browser-supplied redemption metadata.
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

  select *
  into v_decision
  from public.consume_rate_limit(
    v_scope,
    v_subject_hash,
    5,
    60
  );

  if v_decision.allowed is distinct from true then
    raise exception 'redemption rate limit exceeded; retry after % seconds',
      greatest(coalesce(v_decision.retry_after_seconds, 1), 1);
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_redemption_rate_limit()
  from public, anon, authenticated;
grant execute on function public.enforce_redemption_rate_limit()
  to service_role;

drop trigger if exists redemption_rate_limit on public.redemptions;
create trigger redemption_rate_limit
before insert on public.redemptions
for each row
execute function public.enforce_redemption_rate_limit();

comment on function public.enforce_redemption_rate_limit() is
  'Authenticates and environment-classifies direct redemption inserts, then limits customers to five redemption attempts per 60 seconds before the row is created.';

commit;
