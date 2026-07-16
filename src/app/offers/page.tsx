import Link from 'next/link'
import SaveOfferButton from '@/app/components/save-offer-button'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Offer = {
  id: string
  title: string | null
  discount: string | null
  description: string | null
  starts_at: string | null
  ends_at: string | null
  business_id: string
}

type BusinessProfile = {
  id: string
  business_name: string | null
  display_name: string | null
  logo_url: string | null
  phone: string | null
  address: string | null
  website_url: string | null
  google_maps_url: string | null
  role: string | null
}

export default async function OffersPage() {
  const supabase = await createClient()
  const now = new Date()
  const nowIso = now.toISOString()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let hasActivePass = false
  let savedOfferIds = new Set<string>()

  if (user) {
    const { data: entitlements } = await supabase
      .from('customer_entitlements')
      .select('id, status, starts_at, expires_at, revoked_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .lte('starts_at', nowIso)
      .is('revoked_at', null)

    hasActivePass =
      entitlements?.some(
        (entitlement) =>
          !entitlement.expires_at ||
          new Date(entitlement.expires_at) > now
      ) ?? false

    if (hasActivePass) {
      const { data: savedOffers } = await supabase
        .from('saved_offers')
        .select('offer_id')
        .eq('user_id', user.id)

      savedOfferIds = new Set(
        (savedOffers ?? []).map(
          (savedOffer) => savedOffer.offer_id
        )
      )
    }
  }

  const { data: offers, error: offersError } =
    await supabase
      .from('offers')
      .select(
        'id, title, discount, description, starts_at, ends_at, business_id'
      )
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .order('created_at', { ascending: false })

  if (offersError) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-red-100 bg-white p-8 shadow-xl">
          <h1 className="text-3xl font-bold text-gray-900">
            Local Deals
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            We could not load available offers right now. Please try again.
          </p>
        </div>
      </main>
    )
  }

  const candidateOffers =
    (offers as Offer[] | null)?.filter(
      (offer) =>
        Boolean(offer.business_id) &&
        Boolean(offer.title?.trim())
    ) ?? []

  const businessIds = [
    ...new Set(
      candidateOffers.map(
        (offer) => offer.business_id
      )
    ),
  ]

  const { data: profiles } =
    businessIds.length > 0
      ? await supabase
          .from('profiles')
          .select(
            'id, business_name, display_name, logo_url, phone, address, website_url, google_maps_url, role'
          )
          .in('id', businessIds)
          .eq('role', 'business')
      : { data: [] }

  const profileById = Object.fromEntries(
    ((profiles ?? []) as BusinessProfile[])
      .filter((profile) =>
        Boolean(
          profile.business_name?.trim() ||
            profile.display_name?.trim()
        )
      )
      .map((profile) => [profile.id, profile])
  )

  const visibleOffers = candidateOffers.filter(
    (offer) => Boolean(profileById[offer.business_id])
  )

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-blue-50 px-4 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 rounded-3xl border border-yellow-100 bg-white/90 p-6 shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <Link
              href="/"
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              ← Back to home
            </Link>

            <h1 className="mt-4 text-3xl font-bold text-gray-900">
              Exclusive Local Deals
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Preview participating local offers. Full savings and redemption details are available with an active RaiseHub pass.
            </p>
          </div>

          {!user ? (
            <div className="flex shrink-0 flex-col gap-3 sm:items-end">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700"
              >
                Have an active pass? Login here
              </Link>

              <Link
                href="/signup?source=offers"
                className="text-center text-sm font-semibold text-yellow-700 hover:underline sm:text-right"
              >
                Need a pass? Choose a fundraiser →
              </Link>
            </div>
          ) : !hasActivePass ? (
            <Link
              href="/signup?source=offers"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-yellow-600"
            >
              Choose a Fundraiser
            </Link>
          ) : (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              Active pass verified
            </div>
          )}
        </div>

        {visibleOffers.length > 0 ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleOffers.map((offer) => {
              const profile =
                profileById[offer.business_id] as BusinessProfile
              const businessName =
                profile.display_name ||
                profile.business_name ||
                'Local Business'
              const isSaved =
                savedOfferIds.has(offer.id)

              return (
                <article
                  key={offer.id}
                  className="overflow-hidden rounded-3xl border border-yellow-100 bg-white/95 shadow-xl"
                >
                  <div className="flex items-center gap-4 border-b border-yellow-100 p-6">
                    <img
                      src={
                        profile.logo_url ||
                        '/default-business-logo.png'
                      }
                      alt={`${businessName} logo`}
                      className="h-14 w-14 rounded-xl border border-gray-200 object-cover"
                    />

                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold uppercase tracking-wide text-yellow-700">
                        {businessName}
                      </p>
                      <h2 className="mt-1 text-xl font-bold text-gray-900">
                        {offer.title}
                      </h2>
                    </div>
                  </div>

                  <div className="p-6">
                    {hasActivePass ? (
                      <>
                        <p className="text-lg font-semibold text-green-700">
                          {offer.discount ||
                            'Special savings available'}
                        </p>

                        <p className="mt-3 text-sm text-gray-700">
                          {offer.description ||
                            'Exclusive customer offer'}
                        </p>

                        <div className="mt-5 space-y-2 text-sm text-gray-600">
                          {profile.address ? (
                            <p>📍 {profile.address}</p>
                          ) : null}

                          {profile.phone ? (
                            <p>📞 {profile.phone}</p>
                          ) : null}

                          <p>
                            Valid until:{' '}
                            {offer.ends_at
                              ? new Date(
                                  offer.ends_at
                                ).toLocaleDateString()
                              : 'No listed expiration'}
                          </p>
                        </div>

                        {isSaved ? (
                          <div className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-center text-sm font-semibold text-green-700">
                            Added to your pass
                          </div>
                        ) : (
                          <SaveOfferButton
                            offerId={offer.id}
                          />
                        )}
                      </>
                    ) : (
                      <div className="relative overflow-hidden rounded-2xl border border-yellow-100 bg-yellow-50 p-5">
                        <div
                          className="select-none blur-md"
                          aria-hidden="true"
                        >
                          <p className="text-lg font-semibold text-yellow-700">
                            {offer.discount ||
                              'Exclusive pass savings'}
                          </p>

                          <p className="mt-3 text-sm text-gray-700">
                            {offer.description ||
                              'Unlock this participating local offer with your RaiseHub pass.'}
                          </p>

                          <div className="mt-4 space-y-2 text-sm text-gray-600">
                            <p>
                              📍{' '}
                              {profile.address ||
                                'Participating location'}
                            </p>
                            <p>
                              📞{' '}
                              {profile.phone ||
                                'Contact details'}
                            </p>
                          </div>
                        </div>

                        <div className="absolute inset-0 flex items-center justify-center bg-white/65 p-5 text-center">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              Active pass required
                            </p>
                            <p className="mt-1 text-xs text-gray-600">
                              Log in or choose a fundraiser to purchase a pass and unlock full offer details.
                            </p>

                            {!user ? (
                              <Link
                                href="/signup?source=offers"
                                className="mt-3 inline-flex rounded-lg bg-yellow-500 px-3 py-2 text-xs font-semibold text-white hover:bg-yellow-600"
                              >
                                Choose a Fundraiser
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )}

                    <Link
                      href={`/offers/${offer.id}`}
                      className="mt-5 inline-flex text-sm font-medium text-blue-700 hover:underline"
                    >
                      View offer page →
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-yellow-100 bg-white p-8 text-sm text-gray-600 shadow-xl">
            No active local offers are available right now.
          </div>
        )}
      </div>
    </main>
  )
}
