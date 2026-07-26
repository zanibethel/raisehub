begin;

create or replace function public.is_campaign_roster_manager(
  p_campaign_id uuid,
  p_actor_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.profiles p
      where p.id = p_actor_profile_id
        and p.role = 'owner'
    )
    or exists (
      select 1
      from public.campaigns c
      left join public.organizations direct_org
        on direct_org.id = c.canonical_organization_id
      left join public.organizations legacy_org
        on legacy_org.legacy_profile_id = c.organization_id
      join public.organization_memberships om
        on om.organization_id = coalesce(direct_org.id, legacy_org.id)
      where c.id = p_campaign_id
        and om.user_id = p_actor_profile_id
        and om.status = 'active'
        and om.membership_role in ('admin', 'manager')
    );
$$;

revoke all on function public.is_campaign_roster_manager(uuid, uuid) from public, anon, authenticated;
grant execute on function public.is_campaign_roster_manager(uuid, uuid) to service_role;

comment on function public.is_campaign_roster_manager(uuid, uuid) is
  'Authorizes Owner accounts directly by profile role and organization admins/managers through the campaign canonical or legacy organization mapping.';

commit;
