import Link from 'next/link'
import CampaignCard from '@/app/components/campaign-card'
import { getPublicSellableCampaigns } from '@/lib/repositories/public-campaign-repository'

type CampaignsPageProps = {
  searchParams?: Promise<{
    live?: string | string[]
  }>
}

function isLiveRequest(value?: string | string[]) {
  const candidate = Array.isArray(value) ? value[0] : value
  return candidate === '1'
}

export default async function CampaignsPage({
  searchParams,
}: CampaignsPageProps) {
  const params = searchParams ? await searchParams : undefined
  const liveMode = isLiveRequest(params?.live)
  const { campaigns, error } =
    await getPublicSellableCampaigns(
      new Date(),
      liveMode ? 'production' : 'app'
    )

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-8 py-16">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-blue-700">
            Support Local Fundraisers
          </h1>

          <p className="mt-3 max-w-2xl text-sm text-gray-600">
            Browse currently active campaigns that are within their fundraising window.
          </p>

          <div className="mt-8 rounded-2xl border border-blue-100 bg-white p-8 text-sm text-gray-600 shadow">
            We could not load active campaigns right now. Please try again.
          </div>
        </div>
        <footer className="mx-auto mt-16 max-w-5xl border-t border-blue-100 pt-6 text-center text-sm text-gray-500">
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/terms" className="hover:text-blue-700">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-blue-700">
              Privacy
            </Link>
            <Link href="/refund-policy" className="hover:text-blue-700">
              Refund Policy
            </Link>
          </div>

          <p className="mt-4">© {new Date().getFullYear()} RaiseHub</p>
        </footer>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-16">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-blue-700">
          Support Local Fundraisers
        </h1>

        <p className="mt-3 max-w-2xl text-sm text-gray-600">
          {liveMode
            ? 'Browse real active campaigns currently accepting support.'
            : 'Browse currently active campaigns that are within their fundraising window.'}
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              href={`/campaigns/${campaign.id}`}
              actionLabel="Support This Campaign"
              className="min-w-0"
            />
          ))}
        </div>

        {campaigns.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-blue-100 bg-white p-8 text-sm text-gray-600 shadow">
            There are no active campaigns accepting new sales right now.
          </div>
        ) : null}
      </div>
      <footer className="mx-auto mt-16 max-w-5xl border-t border-blue-100 pt-6 text-center text-sm text-gray-500">
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/terms" className="hover:text-blue-700">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-blue-700">
            Privacy
          </Link>
          <Link href="/refund-policy" className="hover:text-blue-700">
            Refund Policy
          </Link>
        </div>

        <p className="mt-4">© {new Date().getFullYear()} RaiseHub</p>
      </footer>
    </main>
  )
}
