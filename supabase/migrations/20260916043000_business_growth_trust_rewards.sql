-- Business Growth & Trust Rewards
-- Canonical business referrals, visible trust states, automatic verification submission,
-- profile/social/legacy milestones, founder multiplier support, and referral reporting.

alter table public.businesses
  add column if not exists founder_status boolean not null default false,
  add column if not exists founder_multiplier numeric not null default 1.00 check (founder_multiplier >= 1),
  add column if not exists founder_multiplier_ends_at timestamptz;

alter table public.offers
  add column if not exists live_streak_started_at timestamptz;

update public.offers
set live_streak_started_at = coalesce(live_streak_started_at, starts_at, created_at)
where is_active = true and live_streak_started_at is null;

create or replace function public.track_offer_live_streak()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_active and (tg_op = 'INSERT' or old.is_active is distinct from true) then
    new.live_streak_started_at := now();
  elsif not new.is_active and tg_op = 'UPDATE' and old.is_active = true then
    new.live_streak_started_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists offers_track_live_streak on public.offers;
create trigger offers_track_live_streak
before insert or update of is_active on public.offers
for each row execute function public.track_offer_live_streak();

create table if not exists public.partner_referrals (
  id uuid primary key default gen_random_uuid(),
  referring_business_id uuid not null references public.businesses(id) on delete cascade,
  referred_business_id uuid references public.businesses(id) on delete set null,
  referral_token text not null unique,
  status text not null default 'invited' check (status in ('invited','signed_up','profile_complete','pending_verification','verified','rewarded','reversed')),
  attributed_email text,
  attributed_at timestamptz,
  signed_up_at timestamptz,
  profile_completed_at timestamptz,
  pending_verification_at timestamptz,
  verified_at timestamptz,
  rewarded_at timestamptz,
  reversed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (referred_business_id)
);

create index if not exists partner_referrals_referrer_idx on public.partner_referrals(referring_business_id, created_at desc);
create index if not exists partner_referrals_referred_idx on public.partner_referrals(referred_business_id);
create index if not exists partner_referrals_status_idx on public.partner_referrals(status, created_at desc);

alter table public.partner_referrals enable row level security;
revoke all on public.partner_referrals from anon;
revoke insert, update, delete on public.partner_referrals from authenticated;
grant select on public.partner_referrals to authenticated;

drop policy if exists "business members read own referrals" on public.partner_referrals;
create policy "business members read own referrals"
  on public.partner_referrals
  for select to authenticated
  using (
    exists (
      select 1 from public.business_memberships bm
      where bm.business_id = partner_referrals.referring_business_id
        and bm.user_id = (select auth.uid()) and bm.status = 'active'
    )
    or exists (
      select 1 from public.business_memberships bm
      where bm.business_id = partner_referrals.referred_business_id
        and bm.user_id = (select auth.uid()) and bm.status = 'active'
    )
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'owner'
    )
  );

create or replace function public.business_profile_required_complete(p_business_id uuid)
returns boolean
language sql stable set search_path = public
as $$
  select exists (
    select 1
    from public.businesses b
    left join public.profiles p on p.id = b.legacy_profile_id
    where b.id = p_business_id
      and coalesce(nullif(trim(b.name),''), nullif(trim(p.business_name),'')) is not null
      and coalesce(nullif(trim(b.phone),''), nullif(trim(p.phone),'')) is not null
      and coalesce(nullif(trim(b.address),''), nullif(trim(p.address),'')) is not null
      and coalesce(nullif(trim(b.logo_url),''), nullif(trim(p.logo_url),'')) is not null
  )
$$;

create or replace function public.award_partner_point_once(
  p_business_id uuid,
  p_event_type text,
  p_points numeric,
  p_source_type text,
  p_source_id uuid,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_period_id uuid;
  v_verified boolean := false;
  v_is_demo boolean := false;
  v_demo_group text;
begin
  select id into v_period_id
  from public.partner_reward_periods
  where status = 'open' and starts_at <= now() and ends_at > now()
  order by starts_at desc limit 1;
  if v_period_id is null then return; end if;

  select coalesce(b.is_demo,false), b.demo_group,
         exists(select 1 from public.business_verifications bv where bv.business_id=b.id and bv.status='approved')
    into v_is_demo, v_demo_group, v_verified
  from public.businesses b where b.id = p_business_id;

  insert into public.partner_point_events (
    business_id,reward_period_id,event_type,points,eligibility_status,source_type,source_id,
    idempotency_key,rule_version,metadata,is_demo,demo_group
  ) values (
    p_business_id,v_period_id,p_event_type,p_points,
    case when v_verified then 'eligible' else 'pending' end,
    p_source_type,p_source_id,p_idempotency_key,'partner_rewards_v1',coalesce(p_metadata,'{}'::jsonb),v_is_demo,v_demo_group
  ) on conflict (idempotency_key) do nothing;
end;
$$;

revoke all on function public.award_partner_point_once(uuid,text,numeric,text,uuid,text,jsonb) from public, anon, authenticated;

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

  select * into v_verification from public.business_verifications where business_id=p_business_id for update;

  -- Automatic request: once required details are complete, no separate Apply button is needed.
  if v_complete and v_verification.status in ('not_applied','needs_profile') then
    update public.business_verifications
      set status='pending', application_cycle=application_cycle+1, applied_at=now(), reviewed_at=null,
          reviewed_by=null, declined_at=null, revoked_at=null, review_note=null, updated_at=now()
      where business_id=p_business_id returning * into v_verification;
  elsif not v_complete and v_verification.status not in ('approved','pending') then
    update public.business_verifications set status='needs_profile',updated_at=now() where business_id=p_business_id;
  end if;

  if v_complete then
    perform public.award_partner_point_once(p_business_id,'profile_complete',150,'business',p_business_id,
      'partner:profile_complete:'||p_business_id::text,jsonb_build_object('automatic',true));
  end if;

  -- Optional social / web presence milestones: one-time, non-repeatable.
  if nullif(trim(coalesce(v_profile.facebook_url,'')),'') is not null then
    perform public.award_partner_point_once(p_business_id,'social_facebook_added',50,'business',p_business_id,
      'partner:social_facebook:'||p_business_id::text,'{}'::jsonb);
  end if;
  if nullif(trim(coalesce(v_profile.instagram_url,'')),'') is not null then
    perform public.award_partner_point_once(p_business_id,'social_instagram_added',50,'business',p_business_id,
      'partner:social_instagram:'||p_business_id::text,'{}'::jsonb);
  end if;
  if nullif(trim(coalesce(v_profile.tiktok_url,'')),'') is not null then
    perform public.award_partner_point_once(p_business_id,'social_tiktok_added',50,'business',p_business_id,
      'partner:social_tiktok:'||p_business_id::text,'{}'::jsonb);
  end if;
  if coalesce(nullif(trim(v_business.website_url),''),nullif(trim(coalesce(v_profile.website_url,'')),'')) is not null then
    perform public.award_partner_point_once(p_business_id,'website_added',50,'business',p_business_id,
      'partner:website_added:'||p_business_id::text,'{}'::jsonb);
  end if;

  -- Legacy verification milestones are earned only after the elapsed verified duration.
  if v_verification.status='approved' and v_verification.approved_at is not null then
    if v_verification.approved_at <= now() - interval '30 days' then
      perform public.award_partner_point_once(p_business_id,'legacy_verified_30d',100,'business_verification',v_verification.id,
        'partner:legacy30:'||v_verification.id::text,'{}'::jsonb);
    end if;
    if v_verification.approved_at <= now() - interval '45 days' then
      perform public.award_partner_point_once(p_business_id,'legacy_verified_45d',100,'business_verification',v_verification.id,
        'partner:legacy45:'||v_verification.id::text,'{}'::jsonb);
    end if;
  end if;

  -- Continuous six-month public offer bonus. Pausing resets live_streak_started_at.
  for v_offer in
    select o.id from public.offers o
    where (o.business_id=p_business_id or o.business_id=v_business.legacy_profile_id)
      and o.is_active=true
      and o.live_streak_started_at <= now() - interval '6 months'
  loop
    perform public.award_partner_point_once(p_business_id,'offer_live_6_months',250,'offer',v_offer.id,
      'partner:offer6mo:'||v_offer.id::text,'{}'::jsonb);
  end loop;

  select * into v_ref from public.partner_referrals where referred_business_id=p_business_id limit 1;
  if found then
    if v_ref.signed_up_at is null then
      update public.partner_referrals set status='signed_up',signed_up_at=now(),updated_at=now() where id=v_ref.id;
      perform public.award_partner_point_once(v_ref.referring_business_id,'business_referral_signup',50,'business_referral',v_ref.id,
        'partner:referral:signup:'||v_ref.id::text,jsonb_build_object('referred_business_id',p_business_id));
    end if;
    if v_complete and v_ref.profile_completed_at is null then
      update public.partner_referrals set status='profile_complete',profile_completed_at=now(),updated_at=now() where id=v_ref.id;
      perform public.award_partner_point_once(v_ref.referring_business_id,'business_referral_profile_complete',150,'business_referral',v_ref.id,
        'partner:referral:profile:'||v_ref.id::text,jsonb_build_object('referred_business_id',p_business_id));
    end if;
    if v_verification.status='pending' and v_ref.pending_verification_at is null then
      update public.partner_referrals set status='pending_verification',pending_verification_at=now(),updated_at=now() where id=v_ref.id;
    end if;
  end if;
end;
$$;

revoke all on function public.sync_business_growth_rewards(uuid) from public, anon;
grant execute on function public.sync_business_growth_rewards(uuid) to authenticated;

create or replace function public.create_business_referral(p_referring_business_id uuid, p_email text default null)
returns public.partner_referrals
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.partner_referrals%rowtype;
  v_token text;
begin
  if v_uid is null or not exists (
    select 1 from public.business_memberships bm
    where bm.business_id=p_referring_business_id and bm.user_id=v_uid and bm.status='active'
  ) then raise exception 'Business access required.'; end if;

  v_token := lower(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  insert into public.partner_referrals(referring_business_id,referral_token,attributed_email,attributed_at)
  values(p_referring_business_id,v_token,nullif(lower(trim(coalesce(p_email,''))),''),now())
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.create_business_referral(uuid,text) from public, anon;
grant execute on function public.create_business_referral(uuid,text) to authenticated;

create or replace function public.claim_business_referral(p_referral_token text, p_referred_business_id uuid)
returns public.partner_referrals
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.partner_referrals%rowtype;
begin
  if v_uid is null or not exists (
    select 1 from public.business_memberships bm
    where bm.business_id=p_referred_business_id and bm.user_id=v_uid and bm.status='active'
  ) then raise exception 'Business access required.'; end if;

  select * into v_row from public.partner_referrals where referral_token=lower(trim(p_referral_token)) for update;
  if not found then raise exception 'Referral not found.'; end if;
  if v_row.referring_business_id=p_referred_business_id then raise exception 'Self referrals are not allowed.'; end if;
  if v_row.referred_business_id is not null and v_row.referred_business_id<>p_referred_business_id then raise exception 'Referral already claimed.'; end if;
  if exists(select 1 from public.partner_referrals r where r.referred_business_id=p_referred_business_id and r.id<>v_row.id) then raise exception 'Business already attributed.'; end if;

  update public.partner_referrals
  set referred_business_id=p_referred_business_id,status='signed_up',signed_up_at=coalesce(signed_up_at,now()),updated_at=now()
  where id=v_row.id returning * into v_row;

  perform public.award_partner_point_once(v_row.referring_business_id,'business_referral_signup',50,'business_referral',v_row.id,
    'partner:referral:signup:'||v_row.id::text,jsonb_build_object('referred_business_id',p_referred_business_id));
  perform public.sync_business_growth_rewards(p_referred_business_id);
  return v_row;
end;
$$;

revoke all on function public.claim_business_referral(text,uuid) from public, anon;
grant execute on function public.claim_business_referral(text,uuid) to authenticated;

create or replace function public.process_verified_business_referral(p_business_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_ref public.partner_referrals%rowtype;
begin
  select * into v_ref from public.partner_referrals where referred_business_id=p_business_id for update;
  if not found then return; end if;
  if v_ref.verified_at is null then
    update public.partner_referrals set status='rewarded',verified_at=now(),rewarded_at=now(),updated_at=now() where id=v_ref.id;
    perform public.award_partner_point_once(v_ref.referring_business_id,'business_referral_verified',300,'business_referral',v_ref.id,
      'partner:referral:verified:'||v_ref.id::text,jsonb_build_object('referred_business_id',p_business_id));
  end if;
end;
$$;

revoke all on function public.process_verified_business_referral(uuid) from public, anon, authenticated;

create or replace function public.finalize_business_growth_verification()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if new.status='approved' and old.status is distinct from 'approved' then
    perform public.process_verified_business_referral(new.business_id);
  end if;
  return new;
end;
$$;

drop trigger if exists business_growth_verification_after_update on public.business_verifications;
create trigger business_growth_verification_after_update
after update on public.business_verifications
for each row execute function public.finalize_business_growth_verification();

-- Founder multiplier applies only to renewable activity, not fixed setup/referral/legacy bonuses.
create or replace function public.apply_founder_partner_multiplier()
returns trigger
language plpgsql set search_path = public
as $$
declare
  v_multiplier numeric := 1;
  v_is_founder boolean := false;
  v_ends timestamptz;
begin
  if new.event_type in ('active_offer_daily','redemption','unique_customer_bonus','high_value_offer') then
    select founder_status,founder_multiplier,founder_multiplier_ends_at
      into v_is_founder,v_multiplier,v_ends
    from public.businesses where id=new.business_id;
    if v_is_founder and v_multiplier>1 and (v_ends is null or v_ends>now()) then
      new.metadata := coalesce(new.metadata,'{}'::jsonb) || jsonb_build_object('base_points',new.points,'founder_multiplier',v_multiplier);
      new.points := new.points * v_multiplier;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists partner_points_founder_multiplier on public.partner_point_events;
create trigger partner_points_founder_multiplier
before insert on public.partner_point_events
for each row execute function public.apply_founder_partner_multiplier();

create or replace view public.partner_referral_report as
select
  r.id,r.referring_business_id,rb.name as referring_business_name,
  r.referred_business_id,nb.name as referred_business_name,
  r.referral_token,r.status,r.attributed_email,r.attributed_at,r.signed_up_at,
  r.profile_completed_at,r.pending_verification_at,r.verified_at,r.rewarded_at,
  coalesce(sum(pe.points) filter (where pe.event_type like 'business_referral_%'),0) as referral_points_awarded
from public.partner_referrals r
join public.businesses rb on rb.id=r.referring_business_id
left join public.businesses nb on nb.id=r.referred_business_id
left join public.partner_point_events pe on pe.source_type='business_referral' and pe.source_id=r.id
group by r.id,rb.name,nb.name;

grant select on public.partner_referral_report to authenticated;

comment on table public.partner_referrals is 'Durable business-to-business referral attribution for staged Partner Rewards.';
comment on view public.partner_referral_report is 'Referral funnel and awarded points report used by business and Owner reporting.';
