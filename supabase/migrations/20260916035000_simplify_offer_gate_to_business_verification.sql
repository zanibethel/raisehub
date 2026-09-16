-- Business verification is the single manual trust gate for public offers.
-- Businesses may create offers before verification, but those offers stay private.
-- Once verified, businesses manage/publish their own offers without per-offer Owner review.

alter table public.offers
  add column if not exists publication_intent boolean not null default true;

-- Preserve what each business was trying to publish before applying the trust gate.
update public.offers
set publication_intent = is_active,
    approval_status = 'approved',
    approval_reviewed_at = coalesce(approval_reviewed_at, now()),
    approval_reviewed_by = null,
    approval_review_note = null;

alter table public.offers
  alter column approval_status set default 'approved';

-- Immediately hide any currently-active offer whose business has not been verified.
-- publication_intent remains true so verification can release it later.
update public.offers o
set is_active = false
where o.is_active = true
  and not public.offer_business_is_verified(o.business_id);

create or replace function public.enforce_offer_publish_approval()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_actor_role text;
begin
  select role into v_actor_role
  from public.profiles
  where id = auth.uid();

  -- approval_status is retained only for backward compatibility. Business
  -- verification, not individual offer review, controls public publication.
  new.approval_status := 'approved';
  new.approval_submitted_at := null;
  new.approval_reviewed_at := coalesce(new.approval_reviewed_at, now());
  new.approval_reviewed_by := null;
  new.approval_review_note := null;

  if tg_op = 'INSERT' then
    -- Existing offer creation paths intend a newly-created offer to publish.
    new.publication_intent := coalesce(new.publication_intent, true);

    if not public.offer_business_is_verified(new.business_id) then
      new.is_active := false;
    end if;
  else
    -- A business manually pausing/reactivating an offer updates its desired
    -- publication state. Owner/system verification changes do not overwrite it.
    if old.is_active is distinct from new.is_active
       and coalesce(v_actor_role, '') <> 'owner' then
      new.publication_intent := new.is_active;
    end if;

    if new.is_active and not public.offer_business_is_verified(new.business_id) then
      raise exception 'Business must be verified before offers can be published.';
    end if;
  end if;

  return new;
end;
$$;

-- Per-offer review is no longer part of the product flow.
revoke execute on function public.review_business_offer(uuid,text,text) from authenticated;

comment on column public.offers.publication_intent is 'Whether the business wants this offer published when verification permits it.';
comment on column public.offers.approval_status is 'Legacy compatibility field. Offer publication is gated by business verification, not per-offer Owner approval.';

-- Extend business verification review so approval releases offers that the
-- business intended to publish, while revocation immediately hides live offers.
create or replace function public.review_business_verification(
  p_business_id uuid,
  p_decision text,
  p_note text default null
)
returns public.business_verifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_verification public.business_verifications%rowtype;
  v_period_id uuid;
  v_legacy_profile_id uuid;
  v_subscription_tier text := 'free';
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles p where p.id = v_user_id and p.role = 'owner'
  ) then
    raise exception 'Owner access required.';
  end if;

  if p_decision not in ('approved','declined','revoked') then
    raise exception 'Invalid verification decision.';
  end if;

  select * into v_verification
  from public.business_verifications
  where business_id = p_business_id
  for update;

  if not found then
    raise exception 'Verification application not found.';
  end if;

  if p_decision in ('approved','declined') and v_verification.status <> 'pending' then
    raise exception 'Only pending applications can be approved or declined.';
  end if;

  if p_decision = 'revoked' and v_verification.status <> 'approved' then
    raise exception 'Only approved businesses can be revoked.';
  end if;

  update public.business_verifications
  set status = p_decision,
      reviewed_at = now(),
      reviewed_by = v_user_id,
      approved_at = case when p_decision = 'approved' then now() else approved_at end,
      declined_at = case when p_decision = 'declined' then now() else null end,
      revoked_at = case when p_decision = 'revoked' then now() else null end,
      review_note = nullif(trim(coalesce(p_note,'')),''),
      updated_at = now()
  where business_id = p_business_id
  returning * into v_verification;

  select b.legacy_profile_id, coalesce(p.subscription_tier, 'free')
    into v_legacy_profile_id, v_subscription_tier
  from public.businesses b
  left join public.profiles p on p.id = b.legacy_profile_id
  where b.id = p_business_id;

  if p_decision = 'approved' then
    -- Release offers the business intended to publish. Free businesses receive
    -- at most three active offers; additional offers remain saved and inactive.
    with candidates as (
      select o.id
      from public.offers o
      where o.publication_intent = true
        and (o.business_id = p_business_id or o.business_id = v_legacy_profile_id)
        and (o.ends_at is null or o.ends_at >= now())
      order by o.created_at asc
      limit case when v_subscription_tier = 'free' then 3 else 2147483647 end
    )
    update public.offers o
    set is_active = true
    where o.id in (select id from candidates);

    select id into v_period_id
    from public.partner_reward_periods
    where status = 'open' and starts_at <= now() and ends_at > now()
    order by starts_at desc
    limit 1;

    if v_period_id is not null then
      update public.partner_point_events
      set eligibility_status = 'eligible'
      where business_id = p_business_id
        and reward_period_id = v_period_id
        and eligibility_status = 'pending';

      insert into public.partner_point_events (
        business_id,
        reward_period_id,
        event_type,
        points,
        eligibility_status,
        source_type,
        source_id,
        idempotency_key,
        rule_version,
        metadata
      ) values (
        p_business_id,
        v_period_id,
        'verification_approved',
        200,
        'eligible',
        'business_verification',
        v_verification.id,
        'partner:' || v_period_id::text || ':verification_approved:' || v_verification.id::text || ':cycle:' || v_verification.application_cycle::text,
        'partner_rewards_v1',
        jsonb_build_object('application_cycle', v_verification.application_cycle, 'reviewed_by', v_user_id)
      )
      on conflict (idempotency_key) do nothing;
    end if;
  elsif p_decision = 'revoked' then
    update public.offers
    set is_active = false
    where business_id = p_business_id or business_id = v_legacy_profile_id;
  end if;

  return v_verification;
end;
$$;

revoke all on function public.review_business_verification(uuid,text,text) from public, anon;
grant execute on function public.review_business_verification(uuid,text,text) to authenticated;
