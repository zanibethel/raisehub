import { createClient } from '@/lib/supabase/server'
import BuyCampaignPassButton from '@/app/components/buy-campaign-pass-button'
import Link from 'next/link'
import ShareCampaignButton from '@/app/components/share-campaign-button'

export const dynamic = 'force-dynamic'

type CampaignPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    seller?: string
  }>
}

export default async function CampaignPage({
  params,
  searchParams,
}: CampaignPageProps) {
  const { id } = await params
  const { seller } = await searchParams
  const supabase = await createClient()

  // =========================================
  // 🔐 AUTH CHECK
  // Used to detect if customer already bought this pass.
  // =========================================
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // =========================================
  // 📦 FETCH ACTIVE CAMPAIGN
  // =========================================
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .eq('status', 'active')
    .single()

  if (!campaign) {
    return <div className="p-8">Campaign not found</div>
  }

  // =========================================
  // 🏫 FETCH ORGANIZATIONS FOR DROPDOWN
  // =========================================
  const { data: organizations } = await supabase
    .from('profiles')
    .select('id, business_name, display_name')
    .eq('role', 'organization')
    .order('business_name', { ascending: true })

  // =========================================
  // ✅ CHECK EXISTING PASS PURCHASE
  // Prevents logged-in users from buying same pass again.
  // =========================================
  let hasActivePass = false

  if (user) {
    const { data: existingPurchase } = await supabase
      .from('campaign_purchases')
      .select('id')
      .eq('campaign_id', campaign.id)
      .eq('user_id', user.id)
      .neq('payment_status', 'failed')
      .limit(1)

    hasActivePass = (existingPurchase?.length ?? 0) > 0
  }

  // =========================================
  // 💰 FETCH PROGRESS
  // =========================================
  const { data: purchases } = await supabase
    .from('campaign_purchases')
    .select('organization_earnings')
    .eq('campaign_id', campaign.id)

  const earnings = (purchases ?? []).reduce(
    (sum, purchase) => sum + Number(purchase.organization_earnings ?? 0),
    0
  )

  const goal = Number(campaign.goal_amount ?? 0)
  const progress = goal > 0 ? Math.min((earnings / goal) * 100, 100) : 0

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-3xl">
        {/* =========================================
            🔙 BACK
        ========================================= */}
        <Link href="/campaigns" className="text-sm text-blue-600">
          ← Back to fundraisers
        </Link>

        {/* =========================================
            🏷️ HERO
        ========================================= */}
        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          {campaign.name}
        </h1>

        <p className="mt-2 text-gray-600">
          {campaign.description || 'Support this local fundraiser.'}
        </p>

        {/* =========================================
            📊 PROGRESS
        ========================================= */}
        <div className="mt-6 rounded-2xl border bg-white p-6 shadow">
          <p className="text-sm text-gray-500">Progress</p>

          <p className="mt-2 text-3xl font-bold text-blue-700">
            {progress.toFixed(0)}% of goal
          </p>

          <div className="mt-3 h-3 w-full rounded-full bg-gray-200">
            <div
              className="h-3 rounded-full bg-blue-600"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-2 text-sm text-gray-600">
            ${earnings.toLocaleString()} raised of ${goal.toLocaleString()}
          </p>
        </div>

        {/* =========================================
            💡 VALUE PROP
        ========================================= */}
        <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
          🎟️ Buy one pass. Save locally. Support your community.
        </div>

        {/* =========================================
            💳 SUPPORT SECTION
        ========================================= */}
        <div className="mt-6 rounded-2xl border bg-white p-6 shadow">
          <p className="text-lg font-semibold text-gray-900">
            {hasActivePass ? 'Your pass is active' : 'Get your fundraising pass'}
          </p>

          <p className="mt-1 text-sm text-gray-600">
            {hasActivePass
              ? 'You already have access to this fundraiser pass. You can still make an additional donation.'
              : 'One purchase gives you access to exclusive local deals while supporting this campaign.'}
          </p>

          <div className="mt-4 space-y-3">
            <BuyCampaignPassButton
              campaignId={campaign.id}
              passPrice={Number(campaign.pass_price ?? 0)}
              organizations={organizations ?? []}
              defaultOrganizationId={campaign.organization_id}
              sellerName={seller || ''}
              hasActivePass={hasActivePass}
            />

            <div className="flex justify-center">
              <ShareCampaignButton
                campaignId={campaign.id}
                campaignName={campaign.name}
              />
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            100% of donations go directly to the selected organization.
          </p>
        </div>

        {/* =========================================
            🧠 TRUST / DETAILS
        ========================================= */}
        <div className="mt-6 space-y-2 text-sm text-gray-600">
          <p>✔ Supports local organizations</p>
          <p>✔ Powered by local businesses</p>
          <p>✔ Easy to use digital pass</p>
        </div>
      </div>
    </main>
  )
}