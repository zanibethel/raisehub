-- Route operational alerts through RaiseHub's existing inbound-email forwarding system.
insert into public.support_email_routes (
  address, label, bucket, display_name, forward_to, forward_enabled, is_active, accepts_inbound
)
select
  'alerts@raisehub.app',
  'Operations Alerts',
  'operations',
  'RaiseHub Alerts',
  coalesce(forward_to, array[]::text[]),
  true,
  true,
  true
from public.support_email_routes
where address = 'support@raisehub.app'
limit 1
on conflict (address) do update
set label = excluded.label,
    bucket = excluded.bucket,
    display_name = excluded.display_name,
    forward_to = excluded.forward_to,
    forward_enabled = true,
    is_active = true,
    accepts_inbound = true;
