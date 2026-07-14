export type SelectableCampaignCard = {
  id: string
  organizationId: string | null
  organizationLegacyProfileId: string
  name: string
  organizationName: string | null
  imageUrl: string | null
  amountRaised: number
  goalAmount: number | null
  goalPercentage: number | null
  amountRemaining: number | null
  endsAt: string | null
  daysRemaining: number | null
  createdAt: string
}

export type SellableCampaignOption = SelectableCampaignCard & {
  passPrice: number | null
  description: string | null
  startsAt: string | null
  status: string
}

export type SellableCampaignQueryOptions = {
  organizationId?: string
  organizationLegacyProfileId?: string
  organizationMembershipIds?: string[]
  excludeCampaignId?: string
  now?: Date
}

export type CampaignRecoveryResult =
  | {
      status: 'current-campaign-valid'
      campaignId: string
    }
  | {
      status: 'replacement-found'
      campaignId: string
      replacedCampaignId: string
    }
  | {
      status: 'selection-required'
      replacedCampaignId: string
      campaigns: SellableCampaignOption[]
    }
  | {
      status: 'no-valid-campaign'
      replacedCampaignId: string | null
    }
  | {
      status: 'lookup-failure'
    }
