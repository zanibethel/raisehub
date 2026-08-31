-- Fix PL/pgSQL output-column ambiguity in reject_redemption discovered during QA.

create or replace function public.reject_redemption(
  p_redemption_id uuid,
  p_reason text default null
)
returns table(
  redemption_id uuid,
  rejected_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_redemption record;
  v_actor_is_demo boolean;
  v_actor_demo_group text;
  v_rejected_at timestamptz := now();
begin
  if v_actor_id is null then
    raise exception 'business staff must be logged in';
  end if;

  perform public.finalize_due_redemptions();

  select p.is_demo, p.demo_group
  into v_actor_is_demo, v_actor_demo_group
  from public.profiles p
  where p.id = v_actor_id;

  select r.id, r.offer_id, r.business_profile_id, r.status, r.auto_confirm_at, r.is_demo, r.demo_group
  into v_redemption
  from public.redemptions r
  where r.id = p_redemption_id
  for update;

  if not found then
    raise exception 'redemption was not found';
  end if;

  if not (
    v_redemption.business_profile_id = v_actor_id
    or exists (
      select 1
      from public.businesses b
      left join public.business_memberships bm
        on bm.business_id = b.id
       and bm.user_id = v_actor_id
       and bm.status = 'active'
      where b.legacy_profile_id = v_redemption.business_profile_id
        and (b.created_by = v_actor_id or bm.id is not null)
    )
  ) then
    raise exception 'this redemption belongs to a different business';
  end if;

  if coalesce(v_actor_is_demo, false) is distinct from coalesce(v_redemption.is_demo, false)
     or (coalesce(v_redemption.is_demo, false) and v_actor_demo_group is distinct from v_redemption.demo_group) then
    raise exception 'redemption environment does not match business staff';
  end if;

  if v_redemption.status <> 'pending' then
    raise exception 'only pending redemptions can be rejected';
  end if;

  if v_redemption.auto_confirm_at is not null and v_redemption.auto_confirm_at <= now() then
    perform public.finalize_due_redemptions();
    raise exception 'the 24-hour review window has ended';
  end if;

  update public.redemptions as r
  set status = 'rejected',
      rejected_at = v_rejected_at,
      rejected_by = v_actor_id,
      rejection_reason = nullif(trim(p_reason), '')
  where r.id = p_redemption_id;

  update public.redemption_claims as rc
  set status = 'cancelled'
  where rc.redemption_id = p_redemption_id
    and rc.status = 'pending';

  return query select p_redemption_id, v_rejected_at;
end;
$$;

revoke all on function public.reject_redemption(uuid, text) from public;
grant execute on function public.reject_redemption(uuid, text) to authenticated;
