-- Harden the intentionally public SECURITY DEFINER recovery helper against
-- search_path object-shadowing. All relations referenced by the function are
-- already explicitly schema-qualified.
alter function public.get_campaign_recovery_context(uuid, text, text)
  set search_path = '';
