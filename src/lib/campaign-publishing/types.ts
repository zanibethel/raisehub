export type CampaignPublishingBlockerCode =
  | 'not_authorized'
  | 'campaign_not_draft'
  | 'review_not_submitted'
  | 'review_pending'
  | 'review_changes_requested'
  | 'review_rejected'
  | 'review_suspended'
  | 'approval_invalidated'
  | 'profile_incomplete'
  | 'stripe_account_missing'
  | 'stripe_mode_mismatch'
  | 'stripe_onboarding_incomplete'
  | 'stripe_details_incomplete'
  | 'stripe_payouts_disabled'
  | 'stripe_account_disabled'
  | 'stripe_requirements_due'

export type CampaignPublishingNextActionCode =
  | 'publish_campaign'
  | 'submit_for_review'
  | 'wait_for_review'
  | 'update_campaign'
  | 'contact_support'
  | 'complete_profile'
  | 'complete_payout_setup'
  | 'none'

export type CampaignPublishingBlocker = {
  code: CampaignPublishingBlockerCode
  message: string
  action: CampaignPublishingNextActionCode
}

export type CampaignPublishingNextAction = {
  code: CampaignPublishingNextActionCode
  label: string
  href: string | null
}

export type CampaignPublishingEligibility = {
  canPublish: boolean
  campaignStateReady: boolean
  reviewReady: boolean
  payoutsReady: boolean
  profileReady: boolean
  authorized: boolean
  blockingReasons: CampaignPublishingBlocker[]
  nextAction: CampaignPublishingNextAction
}

export type CampaignPublishingEligibilityInput = {
  campaignId: string
  campaignStatus: string | null | undefined
  reviewStatus: string | null | undefined
  authorized: boolean
  profileReady: boolean
  approvalCurrent?: boolean
  stripe: {
    accountExists: boolean
    expectedLivemode: boolean
    livemode: boolean | null
    onboardingStatus: string | null | undefined
    detailsSubmitted: boolean
    payoutsEnabled: boolean
    disabledReason: string | null | undefined
    requirementsCurrentlyDue: unknown
  }
}
