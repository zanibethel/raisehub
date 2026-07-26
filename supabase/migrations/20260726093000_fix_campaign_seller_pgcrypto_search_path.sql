begin;

alter function public.create_campaign_sellers(uuid, uuid, text[])
  set search_path = public, extensions;

alter function public.create_campaign_seller_invitation(uuid, uuid, text, timestamptz, integer)
  set search_path = public, extensions;

alter function public.accept_campaign_seller_invitation(text, uuid, text)
  set search_path = public, extensions;

comment on function public.create_campaign_sellers(uuid, uuid, text[]) is
  'Creates account-optional campaign sellers. Includes the extensions schema so pgcrypto referral-code generation resolves correctly.';

commit;
