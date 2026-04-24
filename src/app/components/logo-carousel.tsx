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

  if (logos.length === 0) return null

  const repeatedLogos = Array.from(
    { length: 16 },
    (_, index) => logos[index % logos.length]
  )

  function LogoCard({
    partner,
    index,
  }: {
    partner: PartnerProfile
    index: number
  }) {
    const name =
      partner.display_name || partner.business_name || 'Local Partner'

    const logo = (
      <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:h-24 sm:w-40 sm:p-4">
        <img
          src={partner.logo_url || '/default-business-logo.png'}
          alt={`${name} logo`}
          className="max-h-12 max-w-24 object-contain sm:max-h-16 sm:max-w-32"
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
  }

  return (
    <section className="mx-auto mt-12 w-full max-w-5xl overflow-hidden rounded-3xl border border-green-100 bg-white/90 p-4 shadow-xl sm:p-6">
      <div className="mb-5 text-center">
        <h2 className="text-2xl font-semibold text-green-700">
          Local Partners
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Businesses and organizations helping support local fundraising.
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 sm:hidden">
        {repeatedLogos.slice(0, 8).map((partner, index) => (
          <LogoCard
            key={`${partner.id}-mobile-${index}`}
            partner={partner}
            index={index}
          />
        ))}
      </div>

      <div className="relative hidden overflow-hidden sm:block">
        <div className="flex w-max animate-[scroll_40s_linear_infinite] gap-6">
          {repeatedLogos.map((partner, index) => (
            <LogoCard
              key={`${partner.id}-desktop-${index}`}
              partner={partner}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  )
}