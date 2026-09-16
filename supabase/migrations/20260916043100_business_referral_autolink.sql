-- Automatically attach a business signup to the referring business using the signup metadata token.

create or replace function public.auto_claim_business_referral_for_new_business()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_token text;
  v_ref public.partner_referrals%rowtype;
begin
  if new.created_by is null then return new; end if;

  select nullif(lower(trim(raw_user_meta_data->>'business_referral')),'')
    into v_token
  from auth.users
  where id = new.created_by;

  if v_token is null then return new; end if;

  select * into v_ref
  from public.partner_referrals
  where referral_token = v_token
  for update;

  if not found then return new; end if;
  if v_ref.referring_business_id = new.id then return new; end if;
  if v_ref.referred_business_id is not null then return new; end if;
  if exists(select 1 from public.partner_referrals r where r.referred_business_id=new.id and r.id<>v_ref.id) then return new; end if;

  update public.partner_referrals
  set referred_business_id=new.id,
      status='signed_up',
      signed_up_at=coalesce(signed_up_at,now()),
      updated_at=now()
  where id=v_ref.id;

  perform public.award_partner_point_once(
    v_ref.referring_business_id,
    'business_referral_signup',
    50,
    'business_referral',
    v_ref.id,
    'partner:referral:signup:'||v_ref.id::text,
    jsonb_build_object('referred_business_id',new.id)
  );

  perform public.sync_business_growth_rewards(new.id);
  return new;
end;
$$;

revoke all on function public.auto_claim_business_referral_for_new_business() from public, anon, authenticated;

drop trigger if exists businesses_auto_claim_partner_referral on public.businesses;
create trigger businesses_auto_claim_partner_referral
after insert on public.businesses
for each row execute function public.auto_claim_business_referral_for_new_business();

-- Keep verification readiness and optional profile/social rewards synchronized automatically.
create or replace function public.sync_growth_rewards_from_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_business_id uuid;
begin
  select id into v_business_id from public.businesses where legacy_profile_id=new.id limit 1;
  if v_business_id is not null then
    perform public.sync_business_growth_rewards(v_business_id);
  end if;
  return new;
end;
$$;

revoke all on function public.sync_growth_rewards_from_profile_change() from public, anon, authenticated;

drop trigger if exists profiles_sync_business_growth_rewards on public.profiles;
create trigger profiles_sync_business_growth_rewards
after update of business_name,phone,address,logo_url,website_url,facebook_url,instagram_url,tiktok_url on public.profiles
for each row execute function public.sync_growth_rewards_from_profile_change();

create or replace function public.sync_growth_rewards_from_business_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_business_growth_rewards(new.id);
  return new;
end;
$$;

revoke all on function public.sync_growth_rewards_from_business_change() from public, anon, authenticated;

drop trigger if exists businesses_sync_growth_rewards on public.businesses;
create trigger businesses_sync_growth_rewards
after update of name,phone,address,logo_url,website_url on public.businesses
for each row execute function public.sync_growth_rewards_from_business_change();

-- Make the report view obey caller permissions instead of view-owner privileges.
alter view public.partner_referral_report set (security_invoker = true);
