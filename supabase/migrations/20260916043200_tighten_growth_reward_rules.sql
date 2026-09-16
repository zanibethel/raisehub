-- Tighten Business Growth & Trust Rewards after reconciling with existing v1 events.
-- Preserve the existing +100 profile_complete award, use actual renewable event names,
-- add Owner founder controls, and backfill automatic verification readiness/social milestones.

create or replace function public.sync_business_growth_rewards(p_business_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_business public.businesses%rowtype;
  v_profile public.profiles%rowtype;
  v_verification public.business_verifications%rowtype;
  v_complete boolean;
  v_ref public.partner_referrals%rowtype;
  v_offer record;
begin
  select * into v_business from public.businesses where id = p_business_id;
  if not found then return; end if;

  if v_business.legacy_profile_id is not null then
    select * into v_profile from public.profiles where id = v_business.legacy_profile_id;
  end if;

  v_complete := public.business_profile_required_complete(p_business_id);

  insert into public.business_verifications (business_id,status)
  values (p_business_id, case when v_complete then 'pending' else 'needs_profile' end)
  on conflict (business_id) do nothing;

  select * into v_verification
  from public.business_verifications
  where business_id=p_business_id
  for update;

  -- No separate Apply button for a first-time application: completion submits automatically.
  -- Declined/revoked businesses remain Owner-controlled and are not silently resubmitted.
  if v_complete and v_verification.status in ('not_applied','needs_profile') then
    update public.business_verifications
      set status='pending',
          application_cycle=application_cycle+1,
          applied_at=now(),
          reviewed_at=null,
          reviewed_by=null,
          declined_at=null,
          revoked_at=null,
          review_note=null,
          updated_at=now()
      where business_id=p_business_id
      returning * into v_verification;
  elsif not v_complete and v_verification.status not in ('approved','pending') then
    update public.business_verifications
      set status='needs_profile',updated_at=now()
      where business_id=p_business_id;
  end if;

  -- The business's own required-profile award is already provided by Partner Rewards v1 (+100).
  -- Do not create a second profile_complete event here.

  -- Optional presence milestones are one-time and cannot be farmed by remove/re-add behavior.
  if nullif(trim(coalesce(v_profile.facebook_url,'')),'') is not null then
    perform public.award_partner_point_once(
      p_business_id,'social_facebook_added',50,'business',p_business_id,
      'partner:social_facebook:'||p_business_id::text,'{}'::jsonb
    );
  end if;

  if nullif(trim(coalesce(v_profile.instagram_url,'')),'') is not null then
    perform public.award_partner_point_once(
      p_business_id,'social_instagram_added',50,'business',p_business_id,
      'partner:social_instagram:'||p_business_id::text,'{}'::jsonb
    );
  end if;

  if nullif(trim(coalesce(v_profile.tiktok_url,'')),'') is not null then
    perform public.award_partner_point_once(
      p_business_id,'social_tiktok_added',50,'business',p_business_id,
      'partner:social_tiktok:'||p_business_id::text,'{}'::jsonb
    );
  end if;

  if coalesce(nullif(trim(v_business.website_url),''),nullif(trim(coalesce(v_profile.website_url,'')),'')) is not null then
    perform public.award_partner_point_once(
      p_business_id,'website_added',50,'business',p_business_id,
      'partner:website_added:'||p_business_id::text,'{}'::jsonb
    );
  end if;

  -- Legacy trust milestones: +100 after 30 verified days, +100 after 45 verified days.
  if v_verification.status='approved' and v_verification.approved_at is not null then
    if v_verification.approved_at <= now() - interval '30 days' then
      perform public.award_partner_point_once(
        p_business_id,'legacy_verified_30d',100,'business_verification',v_verification.id,
        'partner:legacy30:'||v_verification.id::text,'{}'::jsonb
      );
    end if;

    if v_verification.approved_at <= now() - interval '45 days' then
      perform public.award_partner_point_once(
        p_business_id,'legacy_verified_45d',100,'business_verification',v_verification.id,
        'partner:legacy45:'||v_verification.id::text,'{}'::jsonb
      );
    end if;
  end if;

  -- +250 for a continuously public active offer lasting six months. Pausing resets the streak.
  for v_offer in
    select o.id
    from public.offers o
    where (o.business_id=p_business_id or o.business_id=v_business.legacy_profile_id)
      and o.is_active=true
      and o.live_streak_started_at is not null
      and o.live_streak_started_at <= now() - interval '6 months'
  loop
    perform public.award_partner_point_once(
      p_business_id,'offer_live_6_months',250,'offer',v_offer.id,
      'partner:offer6mo:'||v_offer.id::text,'{}'::jsonb
    );
  end loop;

  -- Staged business-referral funnel: +50 signup, +150 profile, +300 verification.
  select * into v_ref
  from public.partner_referrals
  where referred_business_id=p_business_id
  limit 1;

  if found then
    if v_ref.signed_up_at is null then
      update public.partner_referrals
      set status='signed_up',signed_up_at=now(),updated_at=now()
      where id=v_ref.id;

      perform public.award_partner_point_once(
        v_ref.referring_business_id,'business_referral_signup',50,'business_referral',v_ref.id,
        'partner:referral:signup:'||v_ref.id::text,
        jsonb_build_object('referred_business_id',p_business_id)
      );
    end if;

    if v_complete and v_ref.profile_completed_at is null then
      update public.partner_referrals
      set status='profile_complete',profile_completed_at=now(),updated_at=now()
      where id=v_ref.id;

      perform public.award_partner_point_once(
        v_ref.referring_business_id,'business_referral_profile_complete',150,'business_referral',v_ref.id,
        'partner:referral:profile:'||v_ref.id::text,
        jsonb_build_object('referred_business_id',p_business_id)
      );
    end if;

    if v_verification.status='pending' and v_ref.pending_verification_at is null then
      update public.partner_referrals
      set status='pending_verification',pending_verification_at=now(),updated_at=now()
      where id=v_ref.id;
    end if;
  end if;
end;
$$;

revoke all on function public.sync_business_growth_rewards(uuid) from public, anon;
grant execute on function public.sync_business_growth_rewards(uuid) to authenticated;

-- Founder multiplier applies to renewable usage/activity, never to fixed setup/referral/legacy bonuses.
create or replace function public.apply_founder_partner_multiplier()
returns trigger
language plpgsql set search_path = public
as $$
declare
  v_multiplier numeric := 1;
  v_is_founder boolean := false;
  v_ends timestamptz;
begin
  if new.event_type in (
    'active_offer_daily',
    'confirmed_redemption',
    'unique_supporter_redemption',
    'high_value_offer'
  ) then
    select founder_status,founder_multiplier,founder_multiplier_ends_at
      into v_is_founder,v_multiplier,v_ends
    from public.businesses
    where id=new.business_id;

    if v_is_founder and v_multiplier>1 and (v_ends is null or v_ends>now()) then
      new.metadata := coalesce(new.metadata,'{}'::jsonb) || jsonb_build_object(
        'base_points',new.points,
        'founder_multiplier',v_multiplier
      );
      new.points := new.points * v_multiplier;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.set_business_founder_rewards(
  p_business_id uuid,
  p_enabled boolean,
  p_multiplier numeric default 1.25,
  p_ends_at timestamptz default null
)
returns public.businesses
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_business public.businesses%rowtype;
begin
  if v_uid is null or not exists (
    select 1 from public.profiles p where p.id=v_uid and p.role='owner'
  ) then
    raise exception 'Owner access required.';
  end if;

  if p_enabled and (p_multiplier < 1 or p_multiplier > 3) then
    raise exception 'Founder multiplier must be between 1.00 and 3.00.';
  end if;

  update public.businesses
  set founder_status=p_enabled,
      founder_multiplier=case when p_enabled then p_multiplier else 1.00 end,
      founder_multiplier_ends_at=case when p_enabled then p_ends_at else null end,
      updated_at=now()
  where id=p_business_id
  returning * into v_business;

  if not found then raise exception 'Business not found.'; end if;
  return v_business;
end;
$$;

revoke all on function public.set_business_founder_rewards(uuid,boolean,numeric,timestamptz) from public, anon;
grant execute on function public.set_business_founder_rewards(uuid,boolean,numeric,timestamptz) to authenticated;

-- Ensure every new business enters the trust/reward state machine even without a referral token.
create or replace function public.sync_new_business_growth_rewards()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.sync_business_growth_rewards(new.id);
  return new;
end;
$$;

revoke all on function public.sync_new_business_growth_rewards() from public, anon, authenticated;

drop trigger if exists businesses_sync_growth_rewards_after_insert on public.businesses;
create trigger businesses_sync_growth_rewards_after_insert
after insert on public.businesses
for each row execute function public.sync_new_business_growth_rewards();

-- Backfill current businesses into the automatic trust state and award only new optional milestones.
do $$
declare v_business_id uuid;
begin
  for v_business_id in select id from public.businesses where status='active'
  loop
    perform public.sync_business_growth_rewards(v_business_id);
  end loop;
end;
$$;
