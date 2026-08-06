begin;

create or replace function public.get_campaign_recovery_context(
  p_campaign_id uuid,
  p_expected_environment_mode text,
  p_expected_demo_group text
)
returns table(
  campaign_id uuid,
  organization_legacy_profile_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mode text := lower(coalesce(btrim(p_expected_environment_mode), ''));
  v_demo_group text := nullif(btrim(p_expected_demo_group), '');
begin
  if v_mode not in ('production', 'demo') then
    raise exception 'expected environment mode must be production or demo';
  end if;

  if v_mode = 'production' and v_demo_group is not null then
    raise exception 'production access cannot include expected demo group';
  end if;

  if v_mode = 'demo' and v_demo_group is null then
    raise exception 'demo access requires expected demo group';
  end if;

  return query
  select c.id, c.organization_id
  from public.campaigns c
  where c.id = p_campaign_id
    and (
      (v_mode = 'production' and c.is_demo = false and c.demo_group is null)
      or (v_mode = 'demo' and c.is_demo = true and c.demo_group = v_demo_group)
    );
end;
$$;

create or replace function public.get_public_campaign_progress(
  p_campaign_ids uuid[],
  p_expected_environment_mode text,
  p_expected_demo_group text
)
returns table(
  campaign_id uuid,
  amount_raised numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mode text := lower(coalesce(btrim(p_expected_environment_mode), ''));
  v_demo_group text := nullif(btrim(p_expected_demo_group), '');
begin
  if v_mode not in ('production', 'demo') then
    raise exception 'expected environment mode must be production or demo';
  end if;

  if v_mode = 'production' and v_demo_group is not null then
    raise exception 'production access cannot include expected demo group';
  end if;

  if v_mode = 'demo' and v_demo_group is null then
    raise exception 'demo access requires expected demo group';
  end if;

  if p_campaign_ids is null or cardinality(p_campaign_ids) = 0 then
    return;
  end if;

  if cardinality(p_campaign_ids) > 100 then
    raise exception 'A maximum of 100 campaign IDs may be requested.'
      using errcode = '22023';
  end if;

  return query
  select
    c.id as campaign_id,
    coalesce(
      sum(
        case
          when lower(trim(cp.payment_status)) in (
            'test_paid',
            'paid',
            'succeeded',
            'completed',
            'captured',
            'settled'
          ) then coalesce(cp.organization_earnings, 0)
          else 0
        end
      ),
      0
    )::numeric as amount_raised
  from public.campaigns c
  left join public.campaign_purchases cp
    on cp.campaign_id = c.id
    and cp.is_demo = c.is_demo
    and cp.demo_group is not distinct from c.demo_group
  where c.id = any(p_campaign_ids)
    and c.status = 'active'
    and (c.starts_at is null or c.starts_at <= now())
    and (c.ends_at is null or c.ends_at > now())
    and (
      (v_mode = 'production' and c.is_demo = false and c.demo_group is null)
      or (v_mode = 'demo' and c.is_demo = true and c.demo_group = v_demo_group)
    )
  group by c.id;
end;
$$;

create or replace function public.get_public_campaign_sellers(
  p_campaign_id uuid,
  p_expected_environment_mode text,
  p_expected_demo_group text
)
returns table(
  id uuid,
  display_name text,
  referral_code text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mode text := lower(coalesce(btrim(p_expected_environment_mode), ''));
  v_demo_group text := nullif(btrim(p_expected_demo_group), '');
begin
  if v_mode not in ('production', 'demo') then
    raise exception 'expected environment mode must be production or demo';
  end if;

  if v_mode = 'production' and v_demo_group is not null then
    raise exception 'production access cannot include expected demo group';
  end if;

  if v_mode = 'demo' and v_demo_group is null then
    raise exception 'demo access requires expected demo group';
  end if;

  return query
  select cs.id, cs.display_name, cs.referral_code
  from public.campaign_sellers cs
  join public.campaigns c on c.id = cs.campaign_id
  where cs.campaign_id = p_campaign_id
    and cs.status = 'active'
    and c.status = 'active'
    and (c.starts_at is null or c.starts_at <= now())
    and (c.ends_at is null or c.ends_at > now())
    and (
      (v_mode = 'production' and c.is_demo = false and c.demo_group is null)
      or (v_mode = 'demo' and c.is_demo = true and c.demo_group = v_demo_group)
    )
  order by lower(cs.display_name);
end;
$$;

create or replace function public.resolve_campaign_seller_referral(
  p_campaign_id uuid,
  p_referral_code text,
  p_expected_environment_mode text,
  p_expected_demo_group text
)
returns table(
  campaign_seller_id uuid,
  display_name text,
  valid_for_attribution boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mode text := lower(coalesce(btrim(p_expected_environment_mode), ''));
  v_demo_group text := nullif(btrim(p_expected_demo_group), '');
begin
  if v_mode not in ('production', 'demo') then
    raise exception 'expected environment mode must be production or demo';
  end if;

  if v_mode = 'production' and v_demo_group is not null then
    raise exception 'production access cannot include expected demo group';
  end if;

  if v_mode = 'demo' and v_demo_group is null then
    raise exception 'demo access requires expected demo group';
  end if;

  return query
  select
    cs.id as campaign_seller_id,
    cs.display_name,
    cs.status = 'active' as valid_for_attribution
  from public.campaign_sellers cs
  join public.campaigns c on c.id = cs.campaign_id
  where cs.campaign_id = p_campaign_id
    and cs.referral_code = nullif(btrim(p_referral_code), '')
    and c.status = 'active'
    and (c.starts_at is null or c.starts_at <= now())
    and (c.ends_at is null or c.ends_at > now())
    and (
      (v_mode = 'production' and c.is_demo = false and c.demo_group is null)
      or (v_mode = 'demo' and c.is_demo = true and c.demo_group = v_demo_group)
    )
  limit 1;
end;
$$;

revoke all on function public.get_campaign_recovery_context(uuid, text, text) from public, anon, authenticated;
revoke all on function public.get_public_campaign_progress(uuid[], text, text) from public, anon, authenticated;
revoke all on function public.get_public_campaign_sellers(uuid, text, text) from public, anon, authenticated;
revoke all on function public.resolve_campaign_seller_referral(uuid, text, text, text) from public, anon, authenticated;

grant execute on function public.get_campaign_recovery_context(uuid, text, text) to anon, authenticated, service_role;
grant execute on function public.get_public_campaign_progress(uuid[], text, text) to anon, authenticated, service_role;
grant execute on function public.get_public_campaign_sellers(uuid, text, text) to anon, authenticated, service_role;
grant execute on function public.resolve_campaign_seller_referral(uuid, text, text, text) to anon, authenticated, service_role;

-- Keep legacy signatures executable during the staged rollout. A follow-up
-- cleanup migration must revoke them only after the environment-aware app
-- code is deployed to both Live and Demo.

commit;
