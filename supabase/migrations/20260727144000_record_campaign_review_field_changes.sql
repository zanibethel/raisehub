-- Record the material campaign fields that changed when an approval is invalidated.
-- This gives Owner reviewers a clear revision summary instead of only revision numbers.

create or replace function public.record_campaign_review_reopened()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  resolved_organization_id uuid;
  changed_fields jsonb := '{}'::jsonb;
begin
  if old.review_status = 'approved'
     and new.review_status = 'not_submitted'
     and new.review_invalidated_at is not null
     and new.content_revision is distinct from old.content_revision then
    resolved_organization_id := new.canonical_organization_id;

    if resolved_organization_id is null then
      select organization.id
      into resolved_organization_id
      from public.organizations as organization
      where organization.legacy_profile_id = new.organization_id
      limit 1;
    end if;

    if new.name is distinct from old.name then
      changed_fields := changed_fields || jsonb_build_object(
        'name', jsonb_build_object('before', old.name, 'after', new.name)
      );
    end if;

    if new.description is distinct from old.description then
      changed_fields := changed_fields || jsonb_build_object(
        'description', jsonb_build_object('before', old.description, 'after', new.description)
      );
    end if;

    if new.goal_amount is distinct from old.goal_amount then
      changed_fields := changed_fields || jsonb_build_object(
        'goal_amount', jsonb_build_object('before', old.goal_amount, 'after', new.goal_amount)
      );
    end if;

    if new.starts_at is distinct from old.starts_at then
      changed_fields := changed_fields || jsonb_build_object(
        'starts_at', jsonb_build_object('before', old.starts_at, 'after', new.starts_at)
      );
    end if;

    if new.ends_at is distinct from old.ends_at then
      changed_fields := changed_fields || jsonb_build_object(
        'ends_at', jsonb_build_object('before', old.ends_at, 'after', new.ends_at)
      );
    end if;

    insert into public.campaign_review_events (
      campaign_id,
      organization_id,
      decision_source,
      decision,
      previous_review_status,
      resulting_review_status,
      risk_level,
      risk_flags,
      check_results,
      reason,
      reviewed_by
    ) values (
      new.id,
      resolved_organization_id,
      'system',
      'reopened',
      old.review_status,
      new.review_status,
      'unknown',
      '[]'::jsonb,
      jsonb_build_object(
        'material_edit', true,
        'previous_content_revision', old.content_revision,
        'content_revision', new.content_revision,
        'previous_approved_revision', old.approved_revision,
        'returned_to_draft', true,
        'changed_fields', changed_fields
      ),
      'Campaign details changed after approval. Review was reopened and the campaign returned to draft automatically.',
      null
    );
  end if;

  return new;
end
$$;

revoke execute on function public.record_campaign_review_reopened() from public, anon, authenticated;

-- Recover goal changes for older reopened events when surrounding automated checks
-- captured both the prior and current goal. Other historical fields remain unknown.
with reopened as (
  select
    event.id,
    event.campaign_id,
    event.created_at,
    (
      select prior.check_results -> 'goalAmount'
      from public.campaign_review_events prior
      where prior.campaign_id = event.campaign_id
        and prior.created_at < event.created_at
        and prior.check_results ? 'goalAmount'
      order by prior.created_at desc
      limit 1
    ) as prior_goal,
    (
      select following.check_results -> 'goalAmount'
      from public.campaign_review_events following
      where following.campaign_id = event.campaign_id
        and following.created_at > event.created_at
        and following.check_results ? 'goalAmount'
      order by following.created_at asc
      limit 1
    ) as current_goal
  from public.campaign_review_events event
  where event.decision = 'reopened'
    and not (event.check_results ? 'changed_fields')
)
update public.campaign_review_events event
set check_results = event.check_results || jsonb_build_object(
  'changed_fields',
  case
    when reopened.prior_goal is distinct from reopened.current_goal
      and reopened.prior_goal is not null
      and reopened.current_goal is not null
    then jsonb_build_object(
      'goal_amount', jsonb_build_object(
        'before', reopened.prior_goal,
        'after', reopened.current_goal
      )
    )
    else '{}'::jsonb
  end,
  'historical_change_detail_limited', true
)
from reopened
where event.id = reopened.id;
