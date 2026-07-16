begin;

-- =============================================================================
-- Shared database check for active customer pass access
-- =============================================================================

create or replace function public.has_active_customer_pass()
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.customer_entitlements as entitlement
    left join public.campaign_purchases as purchase
      on purchase.id = entitlement.purchase_id
    where entitlement.user_id = auth.uid()
      and entitlement.status = 'active'
      and entitlement.revoked_at is null
      and entitlement.starts_at <= now()
      and (
        entitlement.expires_at is null
        or entitlement.expires_at > now()
      )
      and (
        entitlement.purchase_id is null
        or purchase.payment_status is null
        or lower(trim(purchase.payment_status)) <> 'failed'
      )
  );
$function$;

revoke all
on function public.has_active_customer_pass()
from public;

grant execute
on function public.has_active_customer_pass()
to authenticated;

-- =============================================================================
-- Secure saved-offer creation at the database boundary
-- =============================================================================

drop policy if exists
  "Users can insert their own saved offers"
on public.saved_offers;

create policy
  "Users can insert available offers with an active pass"
on public.saved_offers
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.has_active_customer_pass()
  and exists (
    select 1
    from public.offers as offer
    where offer.id = offer_id
      and offer.is_active = true
      and (
        offer.starts_at is null
        or offer.starts_at <= now()
      )
      and (
        offer.ends_at is null
        or offer.ends_at >= now()
      )
  )
);

commit;
