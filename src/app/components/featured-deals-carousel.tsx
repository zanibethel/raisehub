import { createClient } from '@/lib/supabase/server'

type Offer = {
  id: string
  title: string | null
  discount: string | null
  description: string | null
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

 const { data: offers, error } = await supabase
  .from('offers')
  .select('id, title, discount, description, starts_at, ends_at, business_id')
  .limit(12)

console.log('featured offers', offers)
console.log('featured offers error', error)

  if (!offers || offers.length === 0) {
  return (
    <div className="mx-auto mt-12 max-w-5xl rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
      Featured deals component loaded, but no offers were returned.
    </div>
  )
}

  const businessIds = [...new Set(offers.map((offer) => offer.business_id))]

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, business_name, display_name, logo_url')
    .in('id', businessIds)

  const profileById = new Map(
    (profiles ?? []).map((profile: Profile) => [profile.id, profile])
  )

  const repeatedOffers = [...offers, ...offers]

  return (
    <section className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-3xl border border-yellow-100 bg-white/90 p-6 shadow-xl">
      <div className="mb-5 text-center">
        <h2 className="text-2xl font-semibold text-yellow-600">
          Featured Local Deals
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Active offers from participating local businesses.
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
                        {offer.title}
                      </h3>
                    </div>
                  </div>

                  <p className="mt-4 text-sm font-medium text-yellow-700">
                    {offer.discount}
                  </p>

                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                    {offer.description}
                  </p>
                </div>

                <p className="mt-4 text-xs text-gray-500">
                  Valid until:{' '}
                  {offer.ends_at
                    ? new Date(offer.ends_at).toLocaleDateString()
                    : '—'}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}