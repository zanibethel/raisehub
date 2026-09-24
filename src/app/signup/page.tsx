import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import SignupForm from './signup-form'

import { getPublicSellableCampaigns } from '@/lib/repositories/public-campaign-repository'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type SignupPageProps = {
  searchParams: Promise<{
    campaignId?: string
    organizationId?: string
    source?: string
    seller?: string
    donation?: string
    organization?: string
    live?: string
    role?: string
  }>
}

function buildAuthenticatedDestination(input: {
  campaignId?: string
  source?: string
  seller?: string
  donation?: string
  organization?: string
}) {
  if (!input.campaignId) {
    return input.source === 'offers'
      ? '/offers'
      : '/campaigns'
  }

  const searchParams = new URLSearchParams()

  if (input.seller) {
    searchParams.set('seller', input.seller)
  }

  if (input.donation) {
    searchParams.set('donation', input.donation)
  }

  if (input.organization) {
    searchParams.set(
      'organization',
      input.organization
    )
  }

  const query = searchParams.toString()

  return query
    ? `/campaigns/${input.campaignId}?${query}`
    : `/campaigns/${input.campaignId}`
}

export default async function SignupPage({
  searchParams,
}: SignupPageProps) {
  const requestedParams = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (requestedParams.role?.trim().toLowerCase() === 'business') {
    redirect(user ? '/workspace/new/business' : '/signup/business')
  }

  if (user) {
    redirect(
      buildAuthenticatedDestination({
        campaignId: requestedParams.campaignId,
        source: requestedParams.source,
        seller: requestedParams.seller,
        donation: requestedParams.donation,
        organization: requestedParams.organization,
      })
    )
  }

  const { campaigns, error } =
    await getPublicSellableCampaigns(
      new Date(),
      requestedParams.live === '1'
        ? 'production'
        : 'app'
    )

  return (
    <main className="min-h-screen bg-[#F7FAFC] px-4 py-6 text-slate-950 sm:px-8 sm:py-12">
      <Suspense
        fallback={
          <div className="mx-auto max-w-md border-t border-slate-200 py-8 text-center sm:rounded-3xl sm:border sm:bg-white sm:p-8 sm:shadow-sm">
            <p className="text-sm text-gray-600">
              Loading signup...
            </p>
          </div>
        }
      >
        <SignupForm
          campaigns={error ? [] : campaigns}
        />
      </Suspense>
    </main>
  )
}
