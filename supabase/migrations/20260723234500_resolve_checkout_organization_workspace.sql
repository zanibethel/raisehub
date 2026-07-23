-- =============================================================================
-- Resolve the canonical fundraising workspace from transitional campaign data
-- =============================================================================

create or replace function public.resolve_checkout_organization_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  if new.organization_workspace_id is not null then
    if not exists (
      select 1
      from public.organizations o
      where o.id = new.organization_workspace_id
        and o.status = 'active'
        and o.archived_at is null
    ) then
      raise exception 'organization workspace is not active';
    end if;

    return new;
  end if;

  select o.id
  into v_workspace_id
  from public.organizations o
  where o.legacy_profile_id = new.selected_organization_id
    and o.status = 'active'
    and o.archived_at is null;

  if v_workspace_id is null then
    raise exception 'canonical organization workspace could not be resolved';
  end if;

  new.organization_workspace_id := v_workspace_id;
  return new;
end;
$$;

drop trigger if exists checkout_attempts_resolve_organization_workspace
  on public.checkout_attempts;

create trigger checkout_attempts_resolve_organization_workspace
before insert or update of selected_organization_id, organization_workspace_id
on public.checkout_attempts
for each row
execute function public.resolve_checkout_organization_workspace();

revoke all on function public.resolve_checkout_organization_workspace()
  from public, anon, authenticated;
