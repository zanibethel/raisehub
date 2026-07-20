import { Suspense } from 'react'

import SignupForm from './signup-form'

import { getSellableCampaigns } from '@/lib/repositories/campaign-repository'

export const dynamic = 'force-dynamic'

export default async function SignupPage() {
  const { campaigns, error } =
    await getSellableCampaigns()

  return (
    <main className="min-h-screen bg-[#F0F6FF] p-5 sm:p-8">
      <Suspense
        fallback={
          <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-md">
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