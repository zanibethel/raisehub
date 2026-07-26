begin;

create or replace function public.create_campaign_sellers(
  p_campaign_id uuid,
  p_actor_profile_id uuid,
  p_names text[]
)
returns table(
  campaign_seller_id uuid,
  display_name text,
  referral_code text,
  status text,
  created boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_org_id uuid;
  v_name text;
  v_code text;
  v_row public.campaign_sellers%rowtype;
begin
  v_org_id := public.resolve_campaign_workspace_organization_id(p_campaign_id);

  if v_org_id is null then
    raise exception 'Campaign organization workspace not found.';
  end if;

  if not public.is_campaign_roster_manager(p_campaign_id, p_actor_profile_id) then
    raise exception 'Organization administrator access is required.';
  end if;

  if coalesce(array_length(p_names, 1), 0) = 0 then
    raise exception 'At least one seller name is required.';
  end if;

  foreach v_name in array p_names loop
    v_name := nullif(btrim(v_name), '');
    if v_name is null then
      continue;
    end if;

    select cs.*
    into v_row
    from public.campaign_sellers cs
    where cs.campaign_id = p_campaign_id
      and lower(cs.display_name) = lower(v_name)
    limit 1;

    if v_row.id is null then
      loop
        v_code := lower(substr(encode(gen_random_bytes(10), 'hex'), 1, 14));
        exit when not exists (
          select 1
          from public.campaign_sellers existing_seller
          where existing_seller.referral_code = v_code
        );
      end loop;

      insert into public.campaign_sellers (
        organization_id,
        campaign_id,
        display_name,
        referral_code,
        created_by
      ) values (
        v_org_id,
        p_campaign_id,
        v_name,
        v_code,
        p_actor_profile_id
      )
      returning * into v_row;

      created := true;
    else
      created := false;
    end if;

    campaign_seller_id := v_row.id;
    display_name := v_row.display_name;
    referral_code := v_row.referral_code;
    status := v_row.status;
    return next;
  end loop;
end;
$$;

revoke all on function public.create_campaign_sellers(uuid, uuid, text[])
  from public, anon, authenticated;
grant execute on function public.create_campaign_sellers(uuid, uuid, text[])
  to service_role;

commit;
