-- =============================================================================
-- Business redemption method
-- =============================================================================
--
-- Stores the business-level redemption preference used as the default for its
-- offers.
--
-- Staff Confirmation is the launch-safe default. The remaining values are
-- reserved for future redemption workflows so the schema will not need another
-- structural change when those methods become available.
-- =============================================================================

alter table public.profiles
add column if not exists redemption_method text;

update public.profiles
set redemption_method = 'staff_confirmation'
where redemption_method is null;

alter table public.profiles
alter column redemption_method
set default 'staff_confirmation';

alter table public.profiles
alter column redemption_method
set not null;

alter table public.profiles
drop constraint if exists profiles_redemption_method_check;

alter table public.profiles
add constraint profiles_redemption_method_check
check (
  redemption_method in (
    'staff_confirmation',
    'qr_code',
    'staff_code',
    'square'
  )
);

comment on column public.profiles.redemption_method is
  'Business-level default redemption method. Staff confirmation is the launch default; QR code, staff code, and Square are reserved for future workflows.';