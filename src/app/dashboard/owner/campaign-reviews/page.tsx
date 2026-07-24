import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

import { reviewCampaignAction } from './actions'

export const metadata = {
  title: 'Campaign Reviews | RaiseHub Owner Console',
}

type CampaignRow = {
  id: string
  name: string
  description: string | null
  goal_amount: number
  status: string
  review_status: string
  review_notes: string | null
  review_submitted_at: string | null
  created_at: string
  organization_id: string
  campaign_type: string
  beneficiary_name: string | null
  beneficiary_relationship: string | null
}

type OrganizationRow = {
  id: string
  name: string
  legacy_profile_id: string | null
}

type StripeAccountRow = {
  organization_id: string
  onboarding_status: string
  details_submitted: boolean
  charges_enabled: boolean
  payouts_enabled: boolean
  disabled_reason: string | null
  requirements_currently_due: string[] | null
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function stripeReadiness(account: StripeAccountRow | undefined) {
  if (!account) return { label: 'Not started', ready: false }
  const ready =
    account.onboarding_status === 'enabled' &&
    account.details_submitted &&
    account.charges_enabled &&
    account.payouts_enabled &&
    !account.disabled_reason &&
    (account.requirements_currently_due?.length ?? 0) === 0

  return {
    label: ready ? 'Payout ready' : account.onboarding_status.replaceAll('_', ' '),
    ready,
  }
}

export default async function OwnerCampaignReviewsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>()

  if (profile?.role !== 'owner') redirect('/dashboard')

  const admin = createAdminClient() as any
  const [{ data: campaigns }, { data: organizations }, { data: stripeAccounts }] =
    await Promise.all([
      admin
        .from('campaigns')
        .select(
          'id, name, description, goal_amount, status, review_status, review_notes, review_submitted_at, created_at, organization_id, campaign_type, beneficiary_name, beneficiary_relationship'
        )
        .in('review_status', ['pending', 'changes_requested', 'rejected', 'suspended'])
        .order('review_submitted_at', { ascending: true, nullsFirst: false }),
      admin.from('organizations').select('id, name, legacy_profile_id'),
      admin
        .from('organization_stripe_accounts')
        .select(
          'organization_id, onboarding_status, details_submitted, charges_enabled, payouts_enabled, disabled_reason, requirements_currently_due'
        )
        .eq('livemode', false),
    ])

  const organizationByLegacyId = new Map<string, OrganizationRow>()
  for (const organization of (organizations ?? []) as OrganizationRow[]) {
    if (organization.legacy_profile_id) {
      organizationByLegacyId.set(organization.legacy_profile_id, organization)
    }
  }

  const stripeByOrganizationId = new Map<string, StripeAccountRow>()
  for (const account of (stripeAccounts ?? []) as StripeAccountRow[]) {
    stripeByOrganizationId.set(account.organization_id, account)
  }

  const queue = (campaigns ?? []) as CampaignRow[]

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard?workspace=owner"
          className="text-sm font-bold text-blue-700 hover:text-blue-900"
        >
          ← Back to Owner Console
        </Link>

        <header className="mt-5 rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
            Trust and safety
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Campaign review queue
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
            Review submitted campaigns, inspect payout readiness, and record an auditable decision before publication.
          </p>
          <div className="mt-5 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
            {queue.length} campaign{queue.length === 1 ? '' : 's'} requiring attention
          </div>
        </header>

        {queue.length === 0 ? (
          <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
            <h2 className="text-xl font-bold">Review queue is clear</h2>
            <p className="mt-2 text-sm leading-6">
              No submitted campaigns currently require an Owner decision.
            </p>
          </section>
        ) : (
          <div className="mt-6 space-y-5">
            {queue.map((campaign) => {
              const organization = organizationByLegacyId.get(campaign.organization_id)
              const stripe = organization
                ? stripeByOrganizationId.get(organization.id)
                : undefined
              const readiness = stripeReadiness(stripe)

              return (
                <article
                  key={campaign.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold capitalize text-amber-900">
                          {campaign.review_status.replaceAll('_', ' ')}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                            readiness.ready
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          Stripe: {readiness.label}
                        </span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold capitalize text-blue-800">
                          {campaign.campaign_type}
                        </span>
                      </div>

                      <h2 className="mt-3 break-words text-2xl font-black text-slate-950">
                        {campaign.name}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-600">
                        {organization?.name ?? 'Organization not linked'}
                      </p>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
                        {campaign.description?.trim() || 'No campaign description provided.'}
                      </p>
                    </div>

                    <div className="grid shrink-0 grid-cols-2 gap-3 lg:w-72">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase text-slate-500">Goal</p>
                        <p className="mt-1 font-black text-slate-950">
                          {formatMoney(Number(campaign.goal_amount ?? 0))}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase text-slate-500">Status</p>
                        <p className="mt-1 font-black capitalize text-slate-950">
                          {campaign.status}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
                    <p><strong>Submitted:</strong><br />{formatDate(campaign.review_submitted_at)}</p>
                    <p><strong>Created:</strong><br />{formatDate(campaign.created_at)}</p>
                    <p><strong>Beneficiary:</strong><br />{campaign.beneficiary_name || 'Organization'}</p>
                    <p><strong>Relationship:</strong><br />{campaign.beneficiary_relationship || 'Not specified'}</p>
                  </div>

                  {campaign.review_notes ? (
                    <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                      <strong>Previous review note:</strong> {campaign.review_notes}
                    </p>
                  ) : null}

                  <form action={reviewCampaignAction} className="mt-5">
                    <input type="hidden" name="campaignId" value={campaign.id} />
                    <label className="block text-sm font-bold text-slate-800" htmlFor={`notes-${campaign.id}`}>
                      Internal decision note
                    </label>
                    <textarea
                      id={`notes-${campaign.id}`}
                      name="notes"
                      rows={3}
                      placeholder="Required for changes requested, rejection, or suspension."
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <button
                        name="decision"
                        value="approved"
                        className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                      <button
                        name="decision"
                        value="changes_requested"
                        className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-amber-600"
                      >
                        Request changes
                      </button>
                      <button
                        name="decision"
                        value="rejected"
                        className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-700"
                      >
                        Reject
                      </button>
                      <button
                        name="decision"
                        value="suspended"
                        className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-white hover:bg-slate-950"
                      >
                        Suspend
                      </button>
                    </div>
                  </form>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}