-- Put existing active businesses into the same one-time verification flow used
-- for new businesses. Complete profiles enter Owner review; incomplete profiles
-- remain blocked until required business identity fields are added.
insert into public.business_verifications (
  business_id,
  status,
  application_cycle,
  applied_at,
  updated_at
)
select
  b.id,
  case
    when coalesce(nullif(trim(b.name), ''), nullif(trim(p.business_name), '')) is not null
      and coalesce(nullif(trim(b.phone), ''), nullif(trim(p.phone), '')) is not null
      and coalesce(nullif(trim(b.address), ''), nullif(trim(p.address), '')) is not null
      and coalesce(nullif(trim(b.logo_url), ''), nullif(trim(p.logo_url), '')) is not null
    then 'pending'
    else 'needs_profile'
  end,
  case
    when coalesce(nullif(trim(b.name), ''), nullif(trim(p.business_name), '')) is not null
      and coalesce(nullif(trim(b.phone), ''), nullif(trim(p.phone), '')) is not null
      and coalesce(nullif(trim(b.address), ''), nullif(trim(p.address), '')) is not null
      and coalesce(nullif(trim(b.logo_url), ''), nullif(trim(p.logo_url), '')) is not null
    then 1
    else 0
  end,
  case
    when coalesce(nullif(trim(b.name), ''), nullif(trim(p.business_name), '')) is not null
      and coalesce(nullif(trim(b.phone), ''), nullif(trim(p.phone), '')) is not null
      and coalesce(nullif(trim(b.address), ''), nullif(trim(p.address), '')) is not null
      and coalesce(nullif(trim(b.logo_url), ''), nullif(trim(p.logo_url), '')) is not null
    then now()
    else null
  end,
  now()
from public.businesses b
left join public.profiles p on p.id = b.legacy_profile_id
where b.status = 'active'
on conflict (business_id) do nothing;
