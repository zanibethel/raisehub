alter table public.offers
  add column if not exists approval_status text not null default 'pending'
    check (approval_status in ('pending','approved','declined')),
  add column if not exists approval_submitted_at timestamptz,
  add column if not exists approval_reviewed_at timestamptz,
  add column if not exists approval_reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists approval_review_note text;

-- Preserve currently-live offers during rollout. Existing inactive offers are also
-- grandfathered as approved so this migration does not unexpectedly change their
-- historical behavior; any material edit will move them back to pending review.
update public.offers
set approval_status = 'approved',
    approval_reviewed_at = coalesce(approval_reviewed_at, now())
where approval_status = 'pending'
  and approval_submitted_at is null;

create index if not exists offers_approval_status_idx
  on public.offers (approval_status, is_active, created_at desc);

create or replace function public.resolve_offer_canonical_business_id(p_offer_business_id uuid)
returns uuid
language sql
stable
set search_path = public
as $$
  select b.id
  from public.businesses b
  where b.id = p_offer_business_id
     or b.legacy_profile_id = p_offer_business_id
  order by case when b.id = p_offer_business_id then 0 else 1 end
  limit 1
$$;

create or replace function public.offer_business_is_verified(p_offer_business_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.business_verifications bv
    where bv.business_id = public.resolve_offer_canonical_business_id(p_offer_business_id)
      and bv.status = 'approved'
  )
$$;

create or replace function public.enforce_offer_publish_approval()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_actor_role text;
  v_material_change boolean := false;
begin
  select role into v_actor_role
  from public.profiles
  where id = auth.uid();

  if tg_op = 'INSERT' then
    -- New business-created offers always enter review unless explicitly created by Owner.
    if coalesce(v_actor_role, '') <> 'owner' then
      new.approval_status := 'pending';
      new.approval_submitted_at := coalesce(new.approval_submitted_at, now());
      new.approval_reviewed_at := null;
      new.approval_reviewed_by := null;
      new.approval_review_note := null;
      new.is_active := false;
    end if;
  else
    v_material_change :=
      old.title is distinct from new.title
      or old.discount is distinct from new.discount
      or old.description is distinct from new.description
      or old.starts_at is distinct from new.starts_at
      or old.ends_at is distinct from new.ends_at
      or old.usage_rule is distinct from new.usage_rule
      or old.customer_value is distinct from new.customer_value;

    -- Material changes by a business invalidate prior approval and require review again.
    if v_material_change and coalesce(v_actor_role, '') <> 'owner' then
      new.approval_status := 'pending';
      new.approval_submitted_at := now();
      new.approval_reviewed_at := null;
      new.approval_reviewed_by := null;
      new.approval_review_note := null;
      new.is_active := false;
    end if;
  end if;

  if new.is_active then
    if new.approval_status <> 'approved' then
      raise exception 'Offer must be approved before it can be published.';
    end if;

    if not public.offer_business_is_verified(new.business_id) then
      raise exception 'Business must be verified before offers can be published.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists offers_publish_approval_guard on public.offers;
create trigger offers_publish_approval_guard
before insert or update on public.offers
for each row execute function public.enforce_offer_publish_approval();

create or replace function public.review_business_offer(
  p_offer_id uuid,
  p_decision text,
  p_note text default null
)
returns public.offers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_offer public.offers%rowtype;
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles p
    where p.id = v_user_id and p.role = 'owner'
  ) then
    raise exception 'Owner access required.';
  end if;

  if p_decision not in ('approved','declined') then
    raise exception 'Invalid offer review decision.';
  end if;

  select * into v_offer
  from public.offers
  where id = p_offer_id
  for update;

  if not found then
    raise exception 'Offer not found.';
  end if;

  if p_decision = 'approved' and not public.offer_business_is_verified(v_offer.business_id) then
    raise exception 'Verify this business before approving its offer.';
  end if;

  update public.offers
  set approval_status = p_decision,
      approval_reviewed_at = now(),
      approval_reviewed_by = v_user_id,
      approval_review_note = nullif(trim(coalesce(p_note,'')),''),
      is_active = case when p_decision = 'approved' then true else false end
  where id = p_offer_id
  returning * into v_offer;

  return v_offer;
end;
$$;

revoke all on function public.review_business_offer(uuid,text,text) from public, anon;
grant execute on function public.review_business_offer(uuid,text,text) to authenticated;

comment on column public.offers.approval_status is 'Owner review state. Business offers remain inactive until approved and the business is verified.';
comment on function public.review_business_offer(uuid,text,text) is 'Owner-only review action. Approval activates an offer only for a verified business.';
