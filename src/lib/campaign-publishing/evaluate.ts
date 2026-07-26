import { evaluateOrganizationPayoutReadiness } from '@/lib/stripe/organization-payout-readiness'

import type {
  CampaignPublishingBlocker,
  CampaignPublishingEligibility,
  CampaignPublishingEligibilityInput,
  CampaignPublishingNextAction,
  CampaignPublishingNextActionCode,
} from './types'

function nextActionFor(
  code: CampaignPublishingNextActionCode,
  campaignId: string
): CampaignPublishingNextAction {
  switch (code) {
    case 'publish_campaign':
      return { code, label: 'Publish campaign', href: null }
    case 'submit_for_review':
      return { code, label: 'Submit for review', href: `/dashboard/campaigns/${campaignId}/edit` }
    case 'wait_for_review':
      return { code, label: 'Wait for review', href: null }
    case 'update_campaign':
      return { code, label: 'Update campaign', href: `/dashboard/campaigns/${campaignId}/edit` }
    case 'contact_support':
      return { code, label: 'Contact RaiseHub support', href: '/support' }
    case 'complete_profile':
      return { code, label: 'Complete organization profile', href: '/dashboard#organization-setup' }
    case 'complete_payout_setup':
      return { code, label: 'Complete payout setup', href: '/dashboard#organization-payouts' }
    case 'none':
      return { code, label: 'No action required', href: null }
  }
}

function addBlocker(
  blockers: CampaignPublishingBlocker[],
  blocker: CampaignPublishingBlocker
) {
  if (!blockers.some((current) => current.code === blocker.code)) {
    blockers.push(blocker)
  }
}

function chooseNextAction(blockers: CampaignPublishingBlocker[]) {
  const priority: CampaignPublishingNextActionCode[] = [
    'contact_support',
    'update_campaign',
    'submit_for_review',
    'wait_for_review',
    'complete_profile',
    'complete_payout_setup',
  ]

  return priority.find((action) => blockers.some((blocker) => blocker.action === action)) ?? 'none'
}

export function evaluateCampaignPublishingEligibility(
  input: CampaignPublishingEligibilityInput
): CampaignPublishingEligibility {
  const blockers: CampaignPublishingBlocker[] = []
  const campaignStatus = input.campaignStatus?.trim().toLowerCase() ?? ''
  const reviewStatus = input.reviewStatus?.trim().toLowerCase() || 'not_submitted'
  const approvalCurrent = input.approvalCurrent !== false

  if (!input.authorized) {
    addBlocker(blockers, {
      code: 'not_authorized',
      message: 'You do not have permission to publish this campaign.',
      action: 'contact_support',
    })
  }

  if (campaignStatus !== 'draft') {
    addBlocker(blockers, {
      code: 'campaign_not_draft',
      message:
        campaignStatus === 'active'
          ? 'This campaign is already published.'
          : `A ${campaignStatus || 'non-draft'} campaign cannot be published.`,
      action: 'none',
    })
  }

  switch (reviewStatus) {
    case 'approved':
      if (!approvalCurrent) {
        addBlocker(blockers, {
          code: 'approval_invalidated',
          message: 'Campaign details changed after approval and must be reviewed again.',
          action: 'submit_for_review',
        })
      }
      break
    case 'pending':
      addBlocker(blockers, {
        code: 'review_pending',
        message: 'Campaign review is pending.',
        action: 'wait_for_review',
      })
      break
    case 'changes_requested':
      addBlocker(blockers, {
        code: 'review_changes_requested',
        message: 'RaiseHub requested changes before this campaign can be approved.',
        action: 'update_campaign',
      })
      break
    case 'rejected':
      addBlocker(blockers, {
        code: 'review_rejected',
        message: 'This campaign was rejected and cannot be published.',
        action: 'contact_support',
      })
      break
    case 'suspended':
      addBlocker(blockers, {
        code: 'review_suspended',
        message: 'Campaign review is suspended.',
        action: 'contact_support',
      })
      break
    default:
      addBlocker(blockers, {
        code: 'review_not_submitted',
        message: 'Submit this campaign for review before publishing.',
        action: 'submit_for_review',
      })
  }

  if (!input.profileReady) {
    addBlocker(blockers, {
      code: 'profile_incomplete',
      message: 'Complete the organization profile before publishing.',
      action: 'complete_profile',
    })
  }

  const payoutReadiness = evaluateOrganizationPayoutReadiness(input.stripe)
  for (const blocker of payoutReadiness.blockers) addBlocker(blockers, blocker)

  const campaignStateReady = campaignStatus === 'draft'
  const reviewReady = reviewStatus === 'approved' && approvalCurrent
  const canPublish =
    input.authorized &&
    campaignStateReady &&
    reviewReady &&
    input.profileReady &&
    payoutReadiness.ready

  return {
    canPublish,
    campaignStateReady,
    reviewReady,
    payoutsReady: payoutReadiness.ready,
    profileReady: input.profileReady,
    authorized: input.authorized,
    blockingReasons: blockers,
    nextAction: canPublish
      ? nextActionFor('publish_campaign', input.campaignId)
      : nextActionFor(chooseNextAction(blockers), input.campaignId),
  }
}
