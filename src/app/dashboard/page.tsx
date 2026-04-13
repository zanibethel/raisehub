import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/app/components/logout-button'
import BusinessOfferForm from '@/app/components/business-offer-form'

type Profile = {
  id: string
  email: string | null
  role: 'customer' | 'business' | 'organization' | 'admin'
}

type Offer = {
  id: string
  title: string
  description: string | null
  discount_text: string
  usage_rule: string
  expires_at: string | null
  is_active: boolean
}

function CustomerDashboard() {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-yellow-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-yellow-600">My passes</h2>
        <p className="mt-2 text-sm text-gray-600">
          Your purchased fundraiser passes will appear here.
        </p>
      </div>

      <div className="rounded-2xl border border-yellow-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-yellow-600">Savings</h2>
        <p className="mt-2 text-sm text-gray-600">
          Track how much you have saved across local offers.
        </p>
      </div>

      <div className="rounded-2xl border border-yellow-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-yellow-600">Favorites</h2>
        <p className="mt-2 text-sm text-gray-600">
          Save your favorite participating businesses here.
        </p>
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

function BusinessOffersList({ offers }: { offers: Offer[] }) {
  return (
    <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
      <h2 className="text-lg font-semibold text-green-700">My offers</h2>
      <p className="mt-2 text-sm text-gray-600">
        Your current fundraiser offers.
      </p>

      <div className="mt-6 space-y-4">
        {offers.length === 0 ? (
          <p className="text-sm text-gray-500">No offers yet.</p>
        ) : (
          offers.map((offer) => (
            <div
              key={offer.id}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{offer.title}</h3>
                  <p className="mt-1 text-sm font-medium text-green-700">
                    {offer.discount_text}
                  </p>
                  {offer.description ? (
                    <p className="mt-2 text-sm text-gray-600">
                      {offer.description}
                    </p>
                  ) : null}
                </div>

                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                  {offer.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="rounded-full bg-gray-100 px-2 py-1">
                  Rule: {offer.usage_rule}
                </span>
                {offer.expires_at ? (
                  <span className="rounded-full bg-gray-100 px-2 py-1">
                    Expires: {offer.expires_at}
                  </span>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function BusinessDashboard({
  businessId,
  offers,
}: {
  businessId: string
  offers: Offer[]
}) {
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <BusinessOfferForm businessId={businessId} />
      <BusinessOffersList offers={offers} />

      <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-green-700">Redemptions</h2>
        <p className="mt-2 text-sm text-gray-600">
          Redemption tracking will appear here next.
        </p>
      </div>

      <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-green-700">Marketing tools</h2>
        <p className="mt-2 text-sm text-gray-600">
          AI marketing tools will plug into this area.
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

  const role = profile?.role ?? 'customer'

  let offers: Offer[] = []

  if (role === 'business' && profile) {
    const { data } = await supabase
      .from('offers')
      .select('id, title, description, discount_text, usage_rule, expires_at, is_active')
      .eq('business_id', profile.id)
      .order('created_at', { ascending: false })

    offers = data ?? []
  }

  return (
    <main className="min-h-screen bg-[#F0F6FF] p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">Dashboard</h1>
            <p className="mt-2 text-gray-600">Welcome, {user.email}</p>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Role: {role}
            </p>
          </div>

          <LogoutButton />
        </div>

        {role === 'customer' && <CustomerDashboard />}
        {role === 'business' && profile && (
          <BusinessDashboard businessId={profile.id} offers={offers} />
        )}
        {role === 'organization' && <OrganizationDashboard />}
        {role === 'admin' && <AdminDashboard />}
      </div>
    </main>
  )
}