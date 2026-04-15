import AddOfferForm from '../components/add-offer-form'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/app/components/logout-button'
import SaveOfferButton from '../components/save-offer-button'
import RemoveSavedOfferButton from '../components/remove-saved-offer-button'
import AvailableOffersSection from '../components/available-offers-section'

type Role = 'customer' | 'business' | 'organization' | 'admin'

type Profile = {
  id: string
  email: string | null
  role: Role
}

type Offer = {
  id: string
  title: string | null
  description: string | null
  discount: string | null
  starts_at: string | null
  ends_at: string | null
}

function getRoleTheme(role: Role) {
  switch (role) {
    case 'business':
      return {
        title: 'Business Dashboard',
        badge: 'Business',
        badgeClass:
          'border border-green-200 bg-green-50 text-green-700',
        headingClass: 'text-green-700',
        panelClass:
          'border border-green-100 bg-white/90 shadow-xl backdrop-blur',
        intro:
          'Manage offers, track redemptions, and grow local visibility.',
      }
    case 'organization':
      return {
        title: 'Organization Dashboard',
        badge: 'Organization',
        badgeClass:
          'border border-blue-200 bg-blue-50 text-blue-700',
        headingClass: 'text-blue-700',
        panelClass:
          'border border-blue-100 bg-white/90 shadow-xl backdrop-blur',
        intro:
          'Track fundraising progress, supporters, and business partners.',
      }
    case 'admin':
      return {
        title: 'Admin Dashboard',
        badge: 'Admin',
        badgeClass:
          'border border-gray-300 bg-gray-100 text-gray-800',
        headingClass: 'text-gray-800',
        panelClass:
          'border border-gray-200 bg-white/90 shadow-xl backdrop-blur',
        intro:
          'Manage platform activity, users, and campaigns.',
      }
    default:
      return {
        title: 'Customer Dashboard',
        badge: 'Customer',
        badgeClass:
          'border border-yellow-200 bg-yellow-50 text-yellow-700',
        headingClass: 'text-yellow-600',
        panelClass:
          'border border-yellow-100 bg-white/90 shadow-xl backdrop-blur',
        intro:
          'View your passes, savings, and favorite local businesses.',
      }
  }
}

async function CustomerDashboard() {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: offers } = await supabase
    .from('offers')
    .select('*')
    .lte('starts_at', now)
    .gte('ends_at', now)
    .order('created_at', { ascending: false })

  const { data: savedOffers } = await supabase
    .from('saved_offers')
    .select('id, offer_id')
    .eq('user_id', user.id)

  const savedOfferIds = new Set((savedOffers ?? []).map((item) => item.offer_id))

  return (
    <div className="mt-8 space-y-8">
      <section>
        <div className="rounded-3xl border border-green-100 bg-white/90 p-8 shadow-xl backdrop-blur">
          <h2 className="text-2xl font-semibold text-green-700">My Pass</h2>
          <p className="mt-2 text-sm text-gray-600">
            Your saved offers ready to use.
          </p>
        </div>

        <div className="mt-6">
          {savedOffers && savedOffers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {offers
                ?.filter((offer) => savedOfferIds.has(offer.id))
                .map((offer) => (
                  <div
                    key={offer.id}
                    className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur"
                  >
                    <h3 className="text-lg font-semibold text-green-700">
                      {offer.title}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      {offer.discount}
                    </p>

                    <p className="mt-2 text-sm text-gray-600">
                      {offer.description}
                    </p>

                    <div className="mt-4 space-y-1 text-xs text-gray-500">
                      <p>
                        Ends:{' '}
                        {offer.ends_at
                          ? new Date(offer.ends_at).toLocaleDateString()
                          : '—'}
                      </p>
                    </div>

                    <RemoveSavedOfferButton offerId={offer.id} />
                  </div>
                ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
              <p className="text-sm text-gray-600">
                You haven’t saved any offers yet.
              </p>
            </div>
          )}
        </div>
      </section>

      <AvailableOffersSection
  offers={offers ?? []}
  savedOfferIds={[...savedOfferIds]}
/>
    </div>
  )
}

async function BusinessDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: offers } = await supabase
    .from('offers')
    .select('*')
    .eq('business_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="mt-8">
      <AddOfferForm />

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold text-green-700">
          My Offers
        </h2>

        {offers && offers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur"
              >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-green-700">
                  {offer.title}
                </h3>

                {offer.ends_at && new Date(offer.ends_at) < new Date() ? (
                  <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-600">
                    Expired
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-600">
                    Active
                  </span>
                )} 
              </div>

                <p className="mt-1 text-sm text-gray-500">
                  {offer.discount}
                </p>

                <p className="mt-2 text-sm text-gray-600">
                  {offer.description}
                </p>

                <div className="mt-4 space-y-1 text-xs text-gray-500">
                  <p>
                    Starts:{' '}
                    {offer.starts_at
                      ? new Date(offer.starts_at).toLocaleDateString()
                      : '—'}
                  </p>
                  <p>
                    Ends:{' '}
                    {offer.ends_at
                      ? new Date(offer.ends_at).toLocaleDateString()
                      : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            No offers yet. Create your first one above.
          </p>
        )}
      </div>
    </div>
  )
}

function OrganizationDashboard() {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-blue-700">Fundraiser totals</h2>
        <p className="mt-2 text-sm text-gray-600">
          See how much your campaign has raised.
        </p>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-blue-700">Supporters</h2>
        <p className="mt-2 text-sm text-gray-600">
          View pass purchases and supporter participation.
        </p>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-blue-700">Business partners</h2>
        <p className="mt-2 text-sm text-gray-600">
          Manage participating local businesses here.
        </p>
      </div>
    </div>
  )
}

function AdminDashboard() {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-gray-800">Users</h2>
        <p className="mt-2 text-sm text-gray-600">
          Manage users, businesses, and organizations.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-gray-800">Campaigns</h2>
        <p className="mt-2 text-sm text-gray-600">
          Review active fundraiser campaigns.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-gray-800">Platform settings</h2>
        <p className="mt-2 text-sm text-gray-600">
          Configure platform-wide behavior here.
        </p>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', user.id)
    .single<Profile>()

  const role: Role = profile?.role ?? 'customer'
  const theme = getRoleTheme(role)

  return (
    <main className="min-h-screen bg-[#F0F6FF] p-8">
      <div className="mx-auto max-w-5xl">
        <div className={`rounded-3xl p-8 ${theme.panelClass}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div
                className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${theme.badgeClass}`}
              >
                {theme.badge}
              </div>

              <h1 className={`mt-4 text-3xl font-bold ${theme.headingClass}`}>
                {theme.title}
              </h1>

              <p className="mt-2 text-gray-600">{theme.intro}</p>
              <p className="mt-2 text-sm text-gray-500">Signed in as {user.email}</p>
            </div>

            <div className="sm:pt-1">
              <LogoutButton />
            </div>
          </div>
        </div>

        {role === 'customer' && <CustomerDashboard />}
        {role === 'business' && <BusinessDashboard />}
        {role === 'organization' && <OrganizationDashboard />}
        {role === 'admin' && <AdminDashboard />}
      </div>
    </main>
  )
}