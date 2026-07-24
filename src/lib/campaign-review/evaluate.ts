import 'server-only'

const BLOCKED_PHRASES = [
  'bail',
  'bond money',
  'casino',
  'gambling',
  'investment return',
  'guaranteed return',
  'raffle',
  'sweepstakes',
  'weapon',
  'firearm',
  'controlled substance',
]

const SENSITIVE_PHRASES = [
  'medical',
  'surgery',
  'funeral',
  'memorial',
  'emergency',
  'victim',
  'legal fees',
]

type CampaignRiskInput = {
  name: string
  description: string | null
  goalAmount: number
  startsAt: string | null
  endsAt: string | null
  campaignType: string
  previousApprovedCampaigns: number
  stripeReady: boolean
}

export type CampaignRiskDecision = {
  decision: 'auto_approved' | 'manual_review_required'
  resultingReviewStatus: 'approved' | 'pending'
  riskLevel: 'low' | 'medium' | 'high' | 'blocked'
  riskFlags: string[]
  checkResults: Record<string, boolean | number | string | null>
  reason: string
}

function campaignDurationDays(startsAt: string | null, endsAt: string | null) {
  if (!startsAt || !endsAt) return null

  const start = new Date(startsAt).getTime()
  const end = new Date(endsAt).getTime()

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null
  }

  return Math.ceil((end - start) / 86_400_000)
}

export function evaluateCampaignRisk(
  input: CampaignRiskInput
): CampaignRiskDecision {
  const text = `${input.name} ${input.description ?? ''}`.toLowerCase()
  const blockedMatches = BLOCKED_PHRASES.filter((phrase) => text.includes(phrase))
  const sensitiveMatches = SENSITIVE_PHRASES.filter((phrase) => text.includes(phrase))
  const durationDays = campaignDurationDays(input.startsAt, input.endsAt)
  const riskFlags: string[] = []

  if (input.campaignType !== 'organization') riskFlags.push('personal_campaign')
  if (input.previousApprovedCampaigns === 0) riskFlags.push('first_campaign')
  if (!input.stripeReady) riskFlags.push('stripe_not_ready')
  if (input.goalAmount > 5_000) riskFlags.push('goal_over_5000')
  if (durationDays === null) riskFlags.push('missing_or_invalid_dates')
  if (durationDays !== null && durationDays > 60) riskFlags.push('duration_over_60_days')
  if (sensitiveMatches.length > 0) riskFlags.push('sensitive_purpose')
  if (blockedMatches.length > 0) riskFlags.push('prohibited_term_detected')

  const checkResults = {
    organizationCampaign: input.campaignType === 'organization',
    previousApprovedCampaigns: input.previousApprovedCampaigns,
    stripeReady: input.stripeReady,
    goalAmount: input.goalAmount,
    goalWithinAutoApprovalLimit: input.goalAmount <= 5_000,
    durationDays,
    durationWithinAutoApprovalLimit:
      durationDays !== null && durationDays <= 60,
    sensitiveMatches: sensitiveMatches.join(', ') || null,
    blockedMatches: blockedMatches.join(', ') || null,
  }

  if (blockedMatches.length > 0) {
    return {
      decision: 'manual_review_required',
      resultingReviewStatus: 'pending',
      riskLevel: 'blocked',
      riskFlags,
      checkResults,
      reason: 'Potentially prohibited campaign language requires Owner review.',
    }
  }

  const autoApprovalEligible =
    input.campaignType === 'organization' &&
    input.previousApprovedCampaigns > 0 &&
    input.stripeReady &&
    input.goalAmount <= 5_000 &&
    durationDays !== null &&
    durationDays <= 60 &&
    sensitiveMatches.length === 0

  if (autoApprovalEligible) {
    return {
      decision: 'auto_approved',
      resultingReviewStatus: 'approved',
      riskLevel: 'low',
      riskFlags,
      checkResults,
      reason: 'Trusted Organization campaign passed the standard automated checks.',
    }
  }

  return {
    decision: 'manual_review_required',
    resultingReviewStatus: 'pending',
    riskLevel: sensitiveMatches.length > 0 ? 'high' : 'medium',
    riskFlags,
    checkResults,
    reason: 'Campaign requires human review before publication.',
  }
}
