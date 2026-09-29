-- Referral attribution can award partner points, so only business owners/managers
-- may create or claim referrals. Also harden SECURITY DEFINER search paths.

alter function public.create_business_referral(uuid, text) set search_path = '';
alter function public.claim_business_referral(text, uuid) set search_path = '';

create or replace function public.create_business_referral(p_referring_business_id uuid, p_email text default null::text)
returns public.partner_referrals
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_row public.partner_referrals%rowtype;
  v_token text;
begin
  if v_uid is null or not exists (
    select 1 from public.business_memberships bm
    where bm.business_id=p_referring_business_id and bm.user_id=v_uid
      and bm.status='active' and bm.membership_role in ('owner','manager')
  ) then raise exception 'Business owner or manager access required.'; end if;
  v_token := lower(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  insert into public.partner_referrals(referring_business_id,referral_token,attributed_email,attributed_at)
  values(p_referring_business_id,v_token,nullif(lower(trim(coalesce(p_email,''))),''),now())
  returning * into v_row;
  return v_row;
end;
$function$;

create or replace function public.claim_business_referral(p_referral_token text, p_referred_business_id uuid)
returns public.partner_referrals
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_row public.partner_referrals%rowtype;
  v_email text;
begin
  if v_uid is null or not exists (
    select 1 from public.business_memberships bm
    where bm.business_id=p_referred_business_id and bm.user_id=v_uid
      and bm.status='active' and bm.membership_role in ('owner','manager')
  ) then raise exception 'Business owner or manager access required.'; end if;
  select nullif(lower(trim(email)),'') into v_email from auth.users where id=v_uid;
  select * into v_row from public.partner_referrals
    where referral_token=lower(trim(p_referral_token)) for update;
  if not found then raise exception 'Referral not found.'; end if;
  if v_row.referring_business_id=p_referred_business_id then raise exception 'Self referrals are not allowed.'; end if;
  if v_row.referred_business_id is not null and v_row.referred_business_id<>p_referred_business_id then raise exception 'Referral already claimed.'; end if;
  if exists(select 1 from public.partner_referrals r where r.referred_business_id=p_referred_business_id and r.id<>v_row.id) then raise exception 'Business already attributed.'; end if;
  update public.partner_referrals
    set referred_business_id=p_referred_business_id, attributed_email=coalesce(attributed_email,v_email),
        status='signed_up', signed_up_at=coalesce(signed_up_at,now()), updated_at=now(),
        metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object('claim_method','token')
    where id=v_row.id returning * into v_row;
  insert into public.partner_referral_claims(
    referral_id,referred_business_id,referred_user_id,referred_email,attribution_method,claimed_at,updated_at
  ) values (
    v_row.id,p_referred_business_id,v_uid,v_email,'token',coalesce(v_row.signed_up_at,now()),now()
  )
  on conflict (referral_id) do update
    set referred_business_id=excluded.referred_business_id,
        referred_user_id=excluded.referred_user_id,
        referred_email=excluded.referred_email,
        attribution_method=excluded.attribution_method, updated_at=now();
  perform public.award_partner_point_once(v_row.referring_business_id,'business_referral_signup',50,'business_referral',v_row.id,
    'partner:referral:signup:'||v_row.id::text,jsonb_build_object('referred_business_id',p_referred_business_id));
  perform public.sync_business_growth_rewards(p_referred_business_id);
  return v_row;
end;
$function$;

revoke execute on function public.create_business_referral(uuid,text) from public, anon;
revoke execute on function public.claim_business_referral(text,uuid) from public, anon;
grant execute on function public.create_business_referral(uuid,text) to authenticated;
grant execute on function public.claim_business_referral(text,uuid) to authenticated;
