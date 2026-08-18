begin;

create or replace function public.enforce_gift_pass_creation_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_campaign_is_demo boolean;
  v_campaign_demo_group text;
  v_scope text;
  v_subject_hash text;
  v_decision record;
begin
  if new.purchaser_user_id is null then
    raise exception 'gift pass requires a purchaser identity';
  end if;

  select c.is_demo, c.demo_group
  into v_campaign_is_demo, v_campaign_demo_group
  from public.campaigns c
  where c.id = new.campaign_id;

  if not found then
    raise exception 'gift pass campaign does not exist';
  end if;

  -- Derive gift environment from the authoritative campaign rather than
  -- trusting caller-provided metadata.
  new.is_demo := coalesce(v_campaign_is_demo, false);
  new.demo_group := case
    when coalesce(v_campaign_is_demo, false) then v_campaign_demo_group
    else null
  end;

  v_scope := case
    when coalesce(v_campaign_is_demo, false)
      then 'gift_pass:create:demo:' || coalesce(v_campaign_demo_group, 'missing')
    else 'gift_pass:create:live'
  end;

  v_subject_hash := md5(v_scope || ':' || new.purchaser_user_id::text);

  select *
  into v_decision
  from public.consume_rate_limit(
    v_scope,
    v_subject_hash,
    5,
    60
  );

  if v_decision.allowed is distinct from true then
    raise exception 'gift pass creation rate limit exceeded; retry after % seconds',
      greatest(coalesce(v_decision.retry_after_seconds, 1), 1);
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_gift_pass_creation_rate_limit()
  from public, anon, authenticated;
grant execute on function public.enforce_gift_pass_creation_rate_limit()
  to service_role;

drop trigger if exists gift_pass_creation_rate_limit on public.gift_passes;
create trigger gift_pass_creation_rate_limit
before insert on public.gift_passes
for each row
execute function public.enforce_gift_pass_creation_rate_limit();

comment on function public.enforce_gift_pass_creation_rate_limit() is
  'Derives gift environment from its campaign and limits gift-pass creation to five attempts per purchaser and environment per 60 seconds.';

commit;
