// =============================================================================
// Shared Customer Dashboard Types
// =============================================================================

import type { ComponentProps } from 'react'
import AvailableOffersSection from '@/app/components/available-offers-section'

// Match the offer type already accepted by AvailableOffersSection and include
// the persisted redemption frequency used by customer availability logic.
export type CustomerDashboardOffer =
  ComponentProps<typeof AvailableOffersSection>['offers'][number] & {
    usage_rule?: string | null
  }

export type PurchasedPass = {
  id: string
  created_at: string
  amount_paid: number | null
  selected_organization_id: string | null
  campaigns?: {
    id?: string
    name?: string | null
  } | null
}

export type OrganizationLookup = {
  display_name?: string | null
  business_name?: string | null
}
