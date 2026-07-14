import Link from 'next/link'
import CampaignCard from '@/app/components/campaign-card'
import { getSellableCampaigns } from '@/lib/repositories/campaign-repository'

export default async function CampaignsPage() {
  const { campaigns, error, errorSource } = await getSellableCampaigns()

  if (error) {
    const message =
      errorSource === 'progress'
        ? 'Active campaigns are available, but we could not load fundraising progress right now. Please try again.'
        : 'We could not load active campaigns right now. Please try again.'

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
            {message}
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
          Browse currently active campaigns that are within their fundraising window.
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
