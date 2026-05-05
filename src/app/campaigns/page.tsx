import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function CampaignsPage() {
  const supabase = await createClient()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, description, goal_amount, pass_price, status')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-blue-700">
          Support Local Fundraisers
        </h1>

        <div className="mt-8 grid gap-6">
          {campaigns?.map((campaign) => (
            <div
              key={campaign.id}
              className="rounded-2xl border bg-white p-6 shadow"
            >
              <h2 className="text-xl font-semibold text-gray-900">
                {campaign.name}
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                {campaign.description}
              </p>

              <p className="mt-3 text-sm text-gray-700">
                Goal: ${Number(campaign.goal_amount).toLocaleString()}
              </p>

              <p className="text-sm text-gray-700">
                Pass: ${Number(campaign.pass_price)}
              </p>

              <Link
                href={`/campaigns/${campaign.id}`}
                className="mt-4 inline-block text-blue-600 underline"
              >
                View Campaign →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}