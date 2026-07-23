-- =============================================================================
-- Lock purchase creation to trusted server flows and attach canonical workspaces
-- =============================================================================

alter table public.checkout_attempts
  add column if not exists organization_workspace_id uuid
    references public.organizations(id) on delete restrict;

alter table public.campaign_purchases
  add column if not exists organization_workspace_id uuid
    references public.organizations(id) on delete restrict;

comment on column public.checkout_attempts.organization_workspace_id is
  'Canonical fundraising workspace receiving the purchase. selected_organization_id remains the transitional legacy profile reference.';

comment on column public.campaign_purchases.organization_workspace_id is
  'Canonical fundraising workspace receiving the purchase. Authoritative for future Connect transfers and payout reporting.';

update public.checkout_attempts ca
set organization_workspace_id = o.id
from public.organizations o
where ca.organization_workspace_id is null
  and o.legacy_profile_id = ca.selected_organization_id;

update public.campaign_purchases cp
set organization_workspace_id = o.id
from public.organizations o
where cp.organization_workspace_id is null
  and o.legacy_profile_id = cp.selected_organization_id;

create index if not exists checkout_attempts_organization_workspace_idx
  on public.checkout_attempts (organization_workspace_id, created_at desc)
  where organization_workspace_id is not null;

create index if not exists campaign_purchases_organization_workspace_idx
  on public.campaign_purchases (organization_workspace_id, created_at desc)
  where organization_workspace_id is not null;

-- Browser clients must never create paid purchase records directly.
drop policy if exists "Purchases require an active campaign"
  on public.campaign_purchases;

revoke insert, update, delete on table public.campaign_purchases
  from public, anon, authenticated;

grant select, insert, update on table public.campaign_purchases to service_role;

-- Checkout attempts and webhook records remain service-role only.
revoke all on table public.checkout_attempts from public, anon, authenticated;
revoke all on table public.stripe_webhook_events from public, anon, authenticated;

grant select, insert, update on table public.checkout_attempts to service_role;
grant select, insert, update on table public.stripe_webhook_events to service_role;

create or replace function public.attach_checkout_organization_workspace(
  p_checkout_attempt_id uuid,
  p_organization_workspace_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_checkout_attempt_id is null or p_organization_workspace_id is null then
    raise exception 'checkout attempt and organization workspace are required';
  end if;

  if not exists (
    select 1
    from public.organizations o
    where o.id = p_organization_workspace_id
      and o.status = 'active'
      and o.archived_at is null
  ) then
    raise exception 'organization workspace is not active';
  end if;

  update public.checkout_attempts
  set
    organization_workspace_id = p_organization_workspace_id,
    updated_at = now()
  where id = p_checkout_attempt_id;

  if not found then
    raise exception 'checkout attempt was not found';
  end if;
end;
$$;

revoke all on function public.attach_checkout_organization_workspace(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.attach_checkout_organization_workspace(uuid, uuid)
  to service_role;

create or replace function public.copy_checkout_workspace_to_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.purchase_id is not null and new.organization_workspace_id is not null then
    update public.campaign_purchases
    set organization_workspace_id = new.organization_workspace_id
    where id = new.purchase_id
      and organization_workspace_id is distinct from new.organization_workspace_id;
  end if;

  return new;
end;
$$;

drop trigger if exists checkout_attempts_copy_workspace_to_purchase
  on public.checkout_attempts;

create trigger checkout_attempts_copy_workspace_to_purchase
after insert or update of purchase_id, organization_workspace_id
on public.checkout_attempts
for each row
execute function public.copy_checkout_workspace_to_purchase();

revoke all on function public.copy_checkout_workspace_to_purchase()
  from public, anon, authenticated;
