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
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-slate-50 to-white px-3 py-5 sm:p-8">
      <Suspense
        fallback={
          <div className="mx-auto max-w-md border-b border-gray-200 bg-transparent p-6 text-center sm:rounded-2xl sm:border sm:bg-white sm:shadow-md">
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
