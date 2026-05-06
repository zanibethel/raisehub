import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import TrackedOfferLink from '@/app/components/tracked-offer-link'

type OfferPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function OfferPage({ params }: OfferPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // =========================================
  // 🔐 AUTH CHECK
  // =========================================
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // =========================================
  // 🎟️ PASS OWNERSHIP CHECK
  // Deal details require a purchased fundraiser pass.
  // =========================================
  let hasPurchasedPass = false

  if (user) {
    const { data: purchasedPasses } = await supabase
      .from('campaign_purchases')
      .select('id')
      .eq('user_id', user.id)
      .neq('payment_status', 'failed')
      .limit(1)

    hasPurchasedPass = (purchasedPasses?.length ?? 0) > 0
  }

  const isUnlocked = !!user && hasPurchasedPass

  // =========================================
  // 👁️ TRACK OFFER VIEW
  // =========================================
  await supabase.from('offer_views').insert({
    offer_id: id,
    user_id: user?.id ?? null,
  })

  // =========================================
  // 📦 FETCH ACTIVE OFFER
  // =========================================
  const { data: offer } = await supabase
    .from('offers')
    .select('id, title, discount, description, starts_at, ends_at, business_id')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (!offer) {
    return (
      <main className="min-h-screen bg-slate-50 px-8 py-16">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-gray-900">Offer not found</h1>

          <Link href="/" className="mt-6 inline-flex text-blue-600">
            ← Back home
          </Link>
        </div>
      </main>
    )
  }

  // =========================================
  // 🏪 FETCH BUSINESS PROFILE
  // =========================================
  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'business_name, display_name, logo_url, phone, address, website_url, google_maps_url'
    )
    .eq('id', offer.business_id)
    .single()

  const businessName =
    profile?.display_name || profile?.business_name || 'Local Business'

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-blue-50 px-8 py-16">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm font-medium text-yellow-700">
          ← Back to home
        </Link>

        <div className="mt-6 rounded-3xl border border-yellow-100 bg-white/90 p-8 shadow-xl">
          {/* =========================================
              🏷️ HEADER
          ========================================= */}
          <div className="flex items-center gap-4">
            <img
              src={profile?.logo_url || '/default-business-logo.png'}
              alt={`${businessName} logo`}
              className="h-16 w-16 rounded-xl border border-gray-200 object-cover"
            />

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-yellow-700">
                {businessName}
              </p>

              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                Exclusive Local Deal
              </h1>
            </div>
          </div>

          {/* =========================================
              🔓 / 🔒 DEAL CONTENT
          ========================================= */}
          {isUnlocked ? (
            <div className="mt-8 rounded-2xl border border-green-100 bg-green-50 p-6">
              <p className="text-lg font-semibold text-green-700">
                {offer.discount || 'Special savings available'}
              </p>

              <p className="mt-3 text-gray-700">
                {offer.description || 'Exclusive customer offer'}
              </p>
            </div>
          ) : (
            <div className="relative mt-8 overflow-hidden rounded-2xl border border-yellow-100 bg-yellow-50 p-6">
              <div className="blur-sm">
                <p className="text-lg font-semibold text-yellow-700">
                  {offer.discount || 'Special savings available'}
                </p>

                <p className="mt-3 text-gray-600">
                  {offer.description || 'Exclusive customer offer'}
                </p>
              </div>

              <div className="absolute inset-0 flex items-center justify-center bg-white/70 px-4 text-center">
                <span className="rounded-full bg-yellow-600 px-4 py-2 text-sm font-medium text-white">
                  🔒 Buy a fundraiser pass to unlock deal details
                </span>
              </div>
            </div>
          )}

          {/* =========================================
              📅 META INFO
          ========================================= */}
          <div className="mt-6 space-y-2 text-sm text-gray-600">
            <p>
              Valid until:{' '}
              {offer.ends_at
                ? new Date(offer.ends_at).toLocaleDateString()
                : '—'}
            </p>

            {profile?.address ? <p>📍 {profile.address}</p> : null}
            {profile?.phone ? <p>📞 {profile.phone}</p> : null}
          </div>

          {/* =========================================
              🔘 CTA BUTTON SECTION
          ========================================= */}
          <div className="mt-8 flex flex-wrap gap-3">
            {isUnlocked ? (
              <TrackedOfferLink
                href="/dashboard"
                offerId={offer.id}
                clickType="dashboard_click"
                className="inline-flex rounded-lg bg-green-600 px-5 py-3 text-sm font-medium text-white hover:bg-green-700"
              >
                Go to My Dashboard
              </TrackedOfferLink>
            ) : user ? (
              <Link
                href="/campaigns"
                className="inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                Buy a Fundraiser Pass
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Log in
                </Link>

                <Link
                  href="/signup"
                  className="rounded-lg border border-blue-200 bg-white px-5 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50"
                >
                  Create account
                </Link>
              </>
            )}
          </div>

          {/* =========================================
              🔗 EXTERNAL LINKS
          ========================================= */}
          <div className="mt-5 flex flex-wrap gap-3">
            {profile?.website_url ? (
              <a
                href={
                  profile.website_url.startsWith('http')
                    ? profile.website_url
                    : `https://${profile.website_url}`
                }
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-green-700 underline"
              >
                Visit Website
              </a>
            ) : null}

            {profile?.google_maps_url ? (
              <a
                href={
                  profile.google_maps_url.startsWith('http')
                    ? profile.google_maps_url
                    : `https://${profile.google_maps_url}`
                }
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-green-700 underline"
              >
                View Map
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}