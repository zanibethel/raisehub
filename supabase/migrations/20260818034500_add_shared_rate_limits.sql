begin;

create table if not exists public.rate_limit_buckets (
  scope text not null,
  subject_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (scope, subject_hash)
);

alter table public.rate_limit_buckets enable row level security;

revoke all on table public.rate_limit_buckets from public, anon, authenticated;
grant select, insert, update, delete on table public.rate_limit_buckets to service_role;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_subject_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window interval;
  v_row public.rate_limit_buckets%rowtype;
begin
  if p_scope is null or btrim(p_scope) = '' then
    raise exception 'rate limit scope is required';
  end if;

  if p_subject_hash is null or btrim(p_subject_hash) = '' then
    raise exception 'rate limit subject is required';
  end if;

  if p_limit < 1 then
    raise exception 'rate limit must be at least 1';
  end if;

  if p_window_seconds < 1 then
    raise exception 'rate limit window must be at least 1 second';
  end if;

  v_window := make_interval(secs => p_window_seconds);

  insert into public.rate_limit_buckets (
    scope,
    subject_hash,
    window_started_at,
    request_count,
    updated_at
  )
  values (
    btrim(p_scope),
    btrim(p_subject_hash),
    v_now,
    1,
    v_now
  )
  on conflict (scope, subject_hash) do update
  set
    window_started_at = case
      when public.rate_limit_buckets.window_started_at + v_window <= v_now then v_now
      else public.rate_limit_buckets.window_started_at
    end,
    request_count = case
      when public.rate_limit_buckets.window_started_at + v_window <= v_now then 1
      else public.rate_limit_buckets.request_count + 1
    end,
    updated_at = v_now
  returning * into v_row;

  allowed := v_row.request_count <= p_limit;
  remaining := greatest(p_limit - v_row.request_count, 0);
  retry_after_seconds := case
    when allowed then 0
    else greatest(
      1,
      ceil(extract(epoch from ((v_row.window_started_at + v_window) - v_now)))::integer
    )
  end;

  return next;
end;
$$;

revoke execute on function public.consume_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer)
  to service_role;

create or replace function public.enforce_checkout_attempt_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_scope text;
  v_subject_hash text;
  v_decision record;
begin
  if new.user_id is null then
    raise exception 'checkout attempt requires an authenticated user';
  end if;

  v_scope := case
    when coalesce(new.is_demo, false)
      then 'campaign_checkout:create:demo:' || coalesce(new.demo_group, 'missing')
    else 'campaign_checkout:create:live'
  end;

  v_subject_hash := md5(v_scope || ':' || new.user_id::text);

  select *
  into v_decision
  from public.consume_rate_limit(
    v_scope,
    v_subject_hash,
    5,
    60
  );

  if v_decision.allowed is distinct from true then
    raise exception 'checkout rate limit exceeded; retry after % seconds',
      greatest(coalesce(v_decision.retry_after_seconds, 1), 1);
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_checkout_attempt_rate_limit()
  from public, anon, authenticated;
grant execute on function public.enforce_checkout_attempt_rate_limit()
  to service_role;

drop trigger if exists checkout_attempt_rate_limit on public.checkout_attempts;
create trigger checkout_attempt_rate_limit
before insert on public.checkout_attempts
for each row
execute function public.enforce_checkout_attempt_rate_limit();

comment on table public.rate_limit_buckets is
  'Server-only shared fixed-window rate-limit state. Subjects are stored as hashes, never raw user IDs or IP addresses.';

comment on function public.consume_rate_limit(text, text, integer, integer) is
  'Atomically consumes one shared fixed-window rate-limit token. Callable only by the service role.';

comment on function public.enforce_checkout_attempt_rate_limit() is
  'Blocks more than five checkout-attempt inserts per authenticated buyer and environment in a rolling fixed 60-second window, before Stripe session creation.';

commit;
