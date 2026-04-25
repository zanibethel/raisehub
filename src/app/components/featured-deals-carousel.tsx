import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type Offer = {
  id: string
  title: string | null
  discount: string | null
  description: string | null
  starts_at: string | null
  ends_at: string | null
  business_id: string
}

type Profile = {
  id: string
  business_name: string | null
  display_name: string | null
  logo_url: string | null
}

export default async function FeaturedDealsCarousel() {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data: offers } = await supabase
    .from('offers')
    .select('id, title, discount, description, starts_at, ends_at, business_id')
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('created_at', { ascending: false })
    .limit(12)

  if (!offers || offers.length === 0) return null

  const businessIds = [...new Set(offers.map((offer) => offer.business_id))]

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, business_name, display_name, logo_url')
    .in('id', businessIds)

  const profileById = new Map(
    (profiles ?? []).map((profile: Profile) => [profile.id, profile])
  )

  const repeatedOffers = Array.from(
    { length: 12 },
    (_, index) => offers[index % offers.length]
  )

  return (
    <section className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-3xl border border-yellow-100 bg-white/90 p-6 shadow-xl">
      <div className="mb-5 text-center">
        <h2 className="text-2xl font-semibold text-yellow-600">
          Exclusive Local Deals
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Log in to unlock full deal details from participating businesses.
        </p>
      </div>

      <div className="relative overflow-hidden">
        <div className="flex w-max animate-[scroll_32s_linear_infinite] gap-6">
          {repeatedOffers.map((offer, index) => {
            const profile = profileById.get(offer.business_id)
            const businessName =
              profile?.display_name ||
              profile?.business_name ||
              'Local Business'

            return (
              <div
                key={`${offer.id}-${index}`}
                className="flex w-72 shrink-0 flex-col justify-between rounded-2xl border border-yellow-100 bg-white p-5 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <img
                      src={profile?.logo_url || '/default-business-logo.png'}
                      alt={`${businessName} logo`}
                      className="h-12 w-12 rounded-xl border border-gray-200 object-cover"
                    />

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-yellow-700">
                        {businessName}
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-gray-900">
                        Exclusive Local Deal
                      </h3>
                    </div>
                  </div>

                  <div className="relative mt-4 overflow-hidden rounded-xl border border-yellow-100 bg-yellow-50 p-4">
                    <div className="blur-sm">
                      <p className="text-sm font-medium text-yellow-700">
                        {offer.discount || 'Special savings available'}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                        {offer.description || 'Exclusive customer offer'}
                      </p>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                      <span className="rounded-full bg-yellow-600 px-3 py-1 text-xs font-medium text-white">
                        🔒 Members Only
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="mb-3 text-xs text-gray-500">
                    Valid until:{' '}
                    {offer.ends_at
                      ? new Date(offer.ends_at).toLocaleDateString()
                      : '—'}
                  </p>

                  <Link
                    href="/dashboard"
                    className="block rounded-lg bg-yellow-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-yellow-700"
                  >
                    View Deal
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}