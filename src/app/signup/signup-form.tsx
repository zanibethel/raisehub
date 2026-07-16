'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { SellableCampaignOption } from '@/lib/types/campaigns'

type SignupFormProps = {
  campaigns?: SellableCampaignOption[]
}

export default function SignupForm({
  campaigns = [],
}: SignupFormProps) {
  const searchParams = useSearchParams()
  const supabase = createClient()

  const requestedCampaignId = searchParams.get('campaignId')
  const requestedOrganizationId = searchParams.get('organizationId')
  const requestedSource = searchParams.get('source')

  const initialCampaignId = useMemo(() => {
    if (
      requestedCampaignId &&
      campaigns.some((campaign) => campaign.id === requestedCampaignId)
    ) {
      return requestedCampaignId
    }

    if (requestedOrganizationId) {
      const matchingCampaign = campaigns.find(
        (campaign) =>
          campaign.organizationId === requestedOrganizationId ||
          campaign.organizationLegacyProfileId === requestedOrganizationId
      )

      if (matchingCampaign) return matchingCampaign.id
    }

    return null
  }, [campaigns, requestedCampaignId, requestedOrganizationId])

  const [selectedCampaignId, setSelectedCampaignId] =
    useState<string | null>(initialCampaignId)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedCampaign =
    campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null

  const organizationCampaigns = useMemo(() => {
    if (!requestedOrganizationId) return []

    return campaigns.filter(
      (campaign) =>
        campaign.organizationId === requestedOrganizationId ||
        campaign.organizationLegacyProfileId === requestedOrganizationId
    )
  }, [campaigns, requestedOrganizationId])

  const endingSoon = useMemo(() => {
    return [...campaigns]
      .filter((campaign) => campaign.daysRemaining !== null)
      .sort(
        (left, right) =>
          (left.daysRemaining ?? Infinity) -
          (right.daysRemaining ?? Infinity)
      )
      .slice(0, 8)
  }, [campaigns])

  const almostAtGoal = useMemo(() => {
    return [...campaigns]
      .filter(
        (campaign) =>
          campaign.goalPercentage !== null &&
          campaign.goalPercentage < 100
      )
      .sort(
        (left, right) =>
          (right.goalPercentage ?? -1) -
          (left.goalPercentage ?? -1)
      )
      .slice(0, 8)
  }, [campaigns])

  const campaignGroups =
    organizationCampaigns.length > 0
      ? [
          {
            title: 'Choose a fundraiser',
            campaigns: organizationCampaigns,
          },
        ]
      : [
          {
            title: 'Ending Soon',
            campaigns: endingSoon,
          },
          {
            title: 'Almost at the Goal',
            campaigns: almostAtGoal,
          },
        ]

  async function handleSignup(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const destination = selectedCampaignId
      ? `/campaigns/${selectedCampaignId}`
      : requestedSource === 'offers'
        ? '/offers'
        : '/campaigns'

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'customer',
          selected_campaign_id: selectedCampaignId,
          signup_source: requestedSource,
        },
        emailRedirectTo: `${
          window.location.origin
        }/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      window.location.href = destination
      return
    }

    setMessage(
      selectedCampaignId
        ? 'Account created. Check your email to confirm your account, then continue to your selected fundraiser.'
        : requestedSource === 'offers'
          ? 'Account created. Check your email to confirm your account, then continue to local deals.'
          : 'Account created. Check your email to confirm your account, then continue to current fundraisers.'
    )
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl sm:p-8">
        <p className="text-sm font-semibold text-green-700">
          Support local. Save local.
        </p>

        <h1 className="mt-2 text-3xl font-bold text-blue-600">
          Unlock local deals while supporting your community
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Choose a fundraiser, create your account, and continue to purchase a
          RaiseHub pass. Creating your account does not charge you.
        </p>

        {selectedCampaign ? (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
              You’re supporting
            </p>

            <h2 className="mt-2 text-xl font-bold text-gray-900">
              {selectedCampaign.name}
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              {selectedCampaign.organizationName || 'Local organization'}
            </p>

            <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600">
              {selectedCampaign.goalPercentage !== null ? (
                <span>
                  {Math.round(selectedCampaign.goalPercentage)}% of goal
                </span>
              ) : null}

              {selectedCampaign.daysRemaining !== null ? (
                <span>{selectedCampaign.daysRemaining} days remaining</span>
              ) : null}

              {selectedCampaign.passPrice !== null ? (
                <span>${selectedCampaign.passPrice.toFixed(2)} pass</span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setSelectedCampaignId(null)}
              className="mt-4 text-sm font-medium text-blue-700 hover:underline"
            >
              Choose a different fundraiser
            </button>
          </div>
        ) : campaigns.length > 0 ? (
          <div className="mt-8 space-y-8">
            {campaignGroups.map((group) =>
              group.campaigns.length > 0 ? (
                <section key={group.title}>
                  <h2 className="text-lg font-bold text-gray-900">
                    {group.title}
                  </h2>

                  <div className="mt-4 flex snap-x gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {group.campaigns.map((campaign) => (
                      <button
                        key={campaign.id}
                        type="button"
                        onClick={() => setSelectedCampaignId(campaign.id)}
                        className="w-[280px] min-w-[280px] snap-start rounded-2xl border border-blue-100 bg-white p-5 text-left shadow-md transition hover:border-blue-300 hover:shadow-lg"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                          {campaign.organizationName || 'Local organization'}
                        </p>

                        <h3 className="mt-2 text-lg font-bold text-gray-900">
                          {campaign.name}
                        </h3>

                        <div className="mt-4 space-y-2 text-sm text-gray-600">
                          {campaign.goalPercentage !== null ? (
                            <p>{Math.round(campaign.goalPercentage)}% of goal</p>
                          ) : null}

                          {campaign.amountRemaining !== null ? (
                            <p>
                              ${campaign.amountRemaining.toLocaleString()}{' '}
                              remaining
                            </p>
                          ) : null}

                          {campaign.daysRemaining !== null ? (
                            <p>{campaign.daysRemaining} days remaining</p>
                          ) : null}

                          {campaign.passPrice !== null ? (
                            <p className="font-semibold text-green-700">
                              ${campaign.passPrice.toFixed(2)} pass
                            </p>
                          ) : null}
                        </div>

                        <span className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                          Support This Fundraiser
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null
            )}
          </div>
        ) : null}

        <form onSubmit={handleSignup} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="signup-email"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="signup-email"
              className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div>
            <label
              htmlFor="signup-password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="signup-password"
              className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </div>

          <button
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? 'Creating account...'
              : selectedCampaign
                ? 'Create Account and Continue'
                : 'Create Customer Account'}
          </button>
        </form>

        {message ? (
          <p
            className={`mt-4 text-sm ${
              message.startsWith('Account created')
                ? 'text-green-700'
                : 'text-red-600'
            }`}
          >
            {message}
          </p>
        ) : null}

        <div className="mt-8 border-t border-gray-200 pt-6 text-sm text-gray-600">
          <p>
            Own a local business?{' '}
            <Link
              href="/signup/business"
              className="font-semibold text-green-700 hover:underline"
            >
              Become a RaiseHub Partner →
            </Link>
          </p>

          <p className="mt-3">
            Need to raise funds?{' '}
            <Link
              href="/signup/organization"
              className="font-semibold text-blue-700 hover:underline"
            >
              Create an Organization →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
