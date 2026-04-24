import { createClient } from '@/lib/supabase/server'

type PartnerProfile = {
  id: string
  business_name: string | null
  display_name: string | null
  logo_url: string | null
  website_url: string | null
  role: string | null
}

export default async function LogoCarousel() {
  const supabase = await createClient()

  const { data: partners } = await supabase
    .from('profiles')
    .select('id, business_name, display_name, logo_url, website_url, role')
    .in('role', ['business', 'organization'])
    .limit(20)

  const logos = partners ?? []

  if (logos.length === 0) {
    return null
  }

  const repeatedLogos = Array.from({ length: 12 }, (_, index) => logos[index % logos.length])

  return (
    <section className="mx-auto mt-12 w-full max-w-5xl overflow-hidden rounded-3xl border border-green-100 bg-white/90 p-6 shadow-xl">
      <div className="mb-5 text-center">
        <h2 className="text-2xl font-semibold text-green-700">
          Local Partners
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Businesses and organizations helping support local fundraising.
        </p>
      </div>

      <div className="relative overflow-hidden">
        <div className="flex w-max animate-[scroll_28s_linear_infinite] gap-6">
          {repeatedLogos.map((partner, index) => {
            const name =
              partner.display_name || partner.business_name || 'Local Partner'

            const logo = (
              <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:h-24 sm:w-40 sm:p-4">
                <img
                  src={partner.logo_url || '/default-business-logo.png'}
                  alt={`${name} logo`}
                  className="max-h-12 max-w-20 object-contain sm:max-h-16 sm:max-w-32"
                />
              </div>
            )

            return partner.website_url ? (
              <a
                key={`${partner.id}-${index}`}
                href={partner.website_url}
                target="_blank"
                rel="noreferrer"
                title={name}
              >
                {logo}
              </a>
            ) : (
              <div key={`${partner.id}-${index}`} title={name}>
                {logo}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}