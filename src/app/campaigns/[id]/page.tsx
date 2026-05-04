import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import BuyCampaignPassButton from '@/app/components/buy-campaign-pass-button'

type CampaignPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // =========================================
  // 📦 FETCH CAMPAIGN
  // =========================================
  const { data: campaign } = await supabase
    .from('campaigns')
    .select(
      'id, organization_id, name, description, goal_amount, pass_price, starts_at, ends_at, status'
    )
    .eq('id', id)
    .single()

  if (!campaign) {
    return (
      <main className="min-h-screen bg-slate-50 px-8 py-16">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-gray-900">
            Campaign not found
          </h1>

          <Link href="/" className="mt-6 inline-flex text-blue-600">
            ← Back home
          </Link>
        </div>
      </main>
    )
  }

  // =========================================
  // 🏫 FETCH ORGANIZATION PROFILE
  // =========================================
  const { data: organization } = await supabase
    .from('profiles')
    .select(
      'business_name, display_name, logo_url, phone, address, website_url, google_maps_url'
    )
    .eq('id', campaign.organization_id)
    .single()

  const organizationName =
    organization?.display_name ||
    organization?.business_name ||
    'Local Organization'

  // =========================================
  // 💰 FETCH CAMPAIGN PURCHASE TOTALS
  // =========================================
  const { data: purchases } = await supabase
    .from('campaign_purchases')
    .select('amount_paid, platform_fee, organization_earnings')
    .eq('campaign_id', campaign.id)

  const passesSold = purchases?.length ?? 0

  const organizationEarnings =
    purchases?.reduce(
      (sum, purchase) => sum + Number(purchase.organization_earnings ?? 0),
      0
    ) ?? 0

  const goal = Number(campaign.goal_amount ?? 0)
  const passPrice = Number(campaign.pass_price ?? 0)

  const progress =
    goal > 0 ? Math.min((organizationEarnings / goal) * 100, 100) : 0

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 px-8 py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-medium text-blue-700">
          ← Back to home
        </Link>

        <div className="mt-6 rounded-3xl border border-blue-100 bg-white/90 p-8 shadow-xl">
          {/* =========================================
              🏷️ CAMPAIGN HEADER
          ========================================= */}
          <div className="flex items-center gap-4">
            <img
              src={organization?.logo_url || '/default-business-logo.png'}
              alt={`${organizationName} logo`}
              className="h-16 w-16 rounded-xl border border-gray-200 object-cover"
            />

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                {organizationName}
              </p>

              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                {campaign.name}
              </h1>
            </div>
          </div>

          {/* =========================================
              📝 CAMPAIGN DESCRIPTION
          ========================================= */}
          <p className="mt-6 text-gray-700">
            {campaign.description || 'Support this local fundraising campaign.'}
          </p>

          {/* =========================================
              📊 CAMPAIGN PROGRESS
          ========================================= */}
          <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-blue-700">Raised so far</p>
                <p className="mt-1 text-3xl font-bold text-blue-800">
                  ${organizationEarnings.toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-sm text-blue-700">Goal</p>
                <p className="mt-1 text-3xl font-bold text-blue-800">
                  ${goal.toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-sm text-blue-700">Passes sold</p>
                <p className="mt-1 text-3xl font-bold text-blue-800">
                  {passesSold}
                </p>
              </div>
            </div>

            <div className="mt-6 h-3 w-full rounded-full bg-white">
              <div
                className="h-3 rounded-full bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="mt-2 text-xs text-blue-700">
              {progress.toFixed(1)}% funded
            </p>
          </div>

          {/* =========================================
              💳 BUY PASS SECTION
          ========================================= */}
          <div className="mt-8 rounded-2xl border border-green-100 bg-green-50 p-6">
            <h2 className="text-lg font-semibold text-green-700">
              Support this campaign
            </h2>

            <p className="mt-2 text-sm text-gray-700">
              Buy a fundraising pass for ${passPrice}. This test purchase will
              record campaign support and update fundraising totals.
            </p>

            <div className="mt-4">
              <BuyCampaignPassButton
                campaignId={campaign.id}
                passPrice={passPrice}
              />
            </div>
          </div>

          {/* =========================================
              📅 CAMPAIGN DETAILS
          ========================================= */}
          <div className="mt-6 space-y-2 text-sm text-gray-600">
            <p>Status: {campaign.status}</p>

            {campaign.starts_at ? (
              <p>Starts: {new Date(campaign.starts_at).toLocaleDateString()}</p>
            ) : null}

            {campaign.ends_at ? (
              <p>Ends: {new Date(campaign.ends_at).toLocaleDateString()}</p>
            ) : null}

            {organization?.address ? <p>📍 {organization.address}</p> : null}
            {organization?.phone ? <p>📞 {organization.phone}</p> : null}
          </div>

          {/* =========================================
              🔗 ORGANIZATION LINKS
          ========================================= */}
          <div className="mt-5 flex flex-wrap gap-3">
            {organization?.website_url ? (
              <a
                href={
                  organization.website_url.startsWith('http')
                    ? organization.website_url
                    : `https://${organization.website_url}`
                }
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-green-700 underline"
              >
                Visit Website
              </a>
            ) : null}

            {organization?.google_maps_url ? (
              <a
                href={
                  organization.google_maps_url.startsWith('http')
                    ? organization.google_maps_url
                    : `https://${organization.google_maps_url}`
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