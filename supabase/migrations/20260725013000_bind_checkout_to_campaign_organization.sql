-- Prevent a checkout request from redirecting campaign proceeds to a different
-- organization. The browser-provided organization value is transitional input;
-- the campaign ownership record is the server-side source of truth.

create or replace function public.enforce_checkout_campaign_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_workspace_id uuid;
  v_campaign_legacy_profile_id uuid;
begin
  select
    coalesce(c.canonical_organization_id, o.id),
    o.legacy_profile_id
  into
    v_campaign_workspace_id,
    v_campaign_legacy_profile_id
  from public.campaigns c
  left join public.organizations o
    on o.id = c.canonical_organization_id
    or (
      c.canonical_organization_id is null
      and o.legacy_profile_id = c.organization_id
    )
  where c.id = new.campaign_id;

  if v_campaign_workspace_id is null or v_campaign_legacy_profile_id is null then
    raise exception 'campaign organization workspace could not be resolved';
  end if;

  if new.organization_workspace_id is distinct from v_campaign_workspace_id then
    raise exception 'checkout organization does not match campaign organization';
  end if;

  if new.selected_organization_id is distinct from v_campaign_legacy_profile_id then
    raise exception 'checkout legacy organization does not match campaign organization';
  end if;

  return new;
end;
$$;

comment on function public.enforce_checkout_campaign_organization() is
  'Rejects checkout attempts whose recipient organization differs from the campaign owner.';

revoke all on function public.enforce_checkout_campaign_organization()
  from public, anon, authenticated;

drop trigger if exists zz_checkout_attempts_enforce_campaign_organization
  on public.checkout_attempts;

-- The zz_ prefix intentionally runs this after the existing organization
-- workspace resolution trigger for the same BEFORE event.
create trigger zz_checkout_attempts_enforce_campaign_organization
before insert or update of campaign_id, selected_organization_id, organization_workspace_id
on public.checkout_attempts
for each row
execute function public.enforce_checkout_campaign_organization();
