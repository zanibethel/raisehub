begin;

-- =============================================================================
-- Gift Passes
-- =============================================================================
-- A gift remains unclaimed until a recipient redeems its private claim token.
-- The raw claim token must never be stored. Application code stores only its
-- cryptographic hash in claim_token_hash.

create table if not exists public.gift_passes (
  id uuid primary key default gen_random_uuid(),

  purchaser_user_id uuid not null
    references public.profiles(id)
    on delete restrict,

  campaign_id uuid not null
    references public.campaigns(id)
    on delete restrict,

  selected_organization_id uuid not null
    references public.profiles(id)
    on delete restrict,

  purchase_id uuid
    references public.campaign_purchases(id)
    on delete set null,

  recipient_name text,
  recipient_email text,
  recipient_phone text,
  personal_message text,

  delivery_method text not null default 'share_link'
    check (
      delivery_method in (
        'email',
        'sms',
        'share_link',
        'printable'
      )
    ),

  status text not null default 'pending_payment'
    check (
      status in (
        'pending_payment',
        'purchased',
        'delivered',
        'claimed',
        'cancelled',
        'expired',
        'refunded'
      )
    ),

  claim_token_hash text,
  claim_expires_at timestamptz,

  claimed_by_user_id uuid
    references public.profiles(id)
    on delete restrict,

  claimed_at timestamptz,
  delivered_at timestamptz,

  entitlement_id uuid
    references public.customer_entitlements(id)
    on delete set null,

  is_demo boolean not null default false,
  demo_group text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint gift_passes_recipient_contact_check
    check (
      recipient_email is not null
      or recipient_phone is not null
      or delivery_method in ('share_link', 'printable')
    ),

  constraint gift_passes_claim_state_check
    check (
      (
        status = 'claimed'
        and claimed_by_user_id is not null
        and claimed_at is not null
        and entitlement_id is not null
      )
      or status <> 'claimed'
    ),

  constraint gift_passes_claim_expiration_check
    check (
      claim_expires_at is null
      or claim_expires_at > created_at
    )
);

-- =============================================================================
-- Indexes
-- =============================================================================

create index if not exists gift_passes_purchaser_created_idx
  on public.gift_passes (
    purchaser_user_id,
    created_at desc
  );

create index if not exists gift_passes_claimed_user_created_idx
  on public.gift_passes (
    claimed_by_user_id,
    created_at desc
  )
  where claimed_by_user_id is not null;

create index if not exists gift_passes_campaign_idx
  on public.gift_passes (campaign_id);

create index if not exists gift_passes_organization_idx
  on public.gift_passes (selected_organization_id);

create unique index if not exists gift_passes_claim_token_hash_key
  on public.gift_passes (claim_token_hash)
  where claim_token_hash is not null;

create unique index if not exists gift_passes_entitlement_id_key
  on public.gift_passes (entitlement_id)
  where entitlement_id is not null;

-- =============================================================================
-- Updated-at maintenance
-- =============================================================================

create or replace function public.set_gift_pass_updated_at()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

drop trigger if exists set_gift_pass_updated_at
  on public.gift_passes;

create trigger set_gift_pass_updated_at
before update on public.gift_passes
for each row
execute function public.set_gift_pass_updated_at();

-- =============================================================================
-- Row-level security
-- =============================================================================

alter table public.gift_passes enable row level security;

drop policy if exists
  "Purchasers can view their gift passes"
on public.gift_passes;

create policy
  "Purchasers can view their gift passes"
on public.gift_passes
for select
to authenticated
using (
  purchaser_user_id = auth.uid()
);

drop policy if exists
  "Recipients can view claimed gift passes"
on public.gift_passes;

create policy
  "Recipients can view claimed gift passes"
on public.gift_passes
for select
to authenticated
using (
  status = 'claimed'
  and claimed_by_user_id = auth.uid()
);

drop policy if exists
  "Owners can manage gift passes"
on public.gift_passes;

create policy
  "Owners can manage gift passes"
on public.gift_passes
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.role = 'owner'
  )
)
with check (
  exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.role = 'owner'
  )
);

-- Gift creation, payment completion, delivery, and claiming intentionally have
-- no direct customer INSERT or UPDATE policy. Those operations must pass through
-- validated server actions or privileged payment/claim handlers.

commit;
