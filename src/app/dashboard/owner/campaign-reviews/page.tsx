import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

import { bulkApproveCampaignsAction, reviewCampaignAction } from './actions'

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

type ChangedField = {
  before: unknown
  after: unknown
}

type ReviewEventRow = {
  campaign_id: string
  created_at: string
  check_results: {
    previous_content_revision?: number
    content_revision?: number
    changed_fields?: Record<string, ChangedField>
    historical_change_detail_limited?: boolean
  } | null
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Campaign name',
  description: 'Description',
  goal_amount: 'Fundraising goal',
  starts_at: 'Start date',
  ends_at: 'End date',
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

function formatChangedValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === '') return 'Not set'
  if (field === 'goal_amount') return formatMoney(Number(value))
  if (field === 'starts_at' || field === 'ends_at') return formatDate(String(value))
  return String(value)
}

function stripeReadiness(account: StripeAccountRow | undefined) {
  if (!account) return { label: 'Payout setup not started', ready: false }
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

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function OwnerCampaignReviewsPage({ searchParams }: PageProps) {
  const params = await searchParams
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

  const queue = (campaigns ?? []) as CampaignRow[]
  const campaignIds = queue.map((campaign) => campaign.id)
  const { data: reviewEvents } = campaignIds.length
    ? await admin
        .from('campaign_review_events')
        .select('campaign_id, created_at, check_results')
        .in('campaign_id', campaignIds)
        .eq('decision', 'reopened')
        .order('created_at', { ascending: false })
    : { data: [] }

  const latestReopenByCampaign = new Map<string, ReviewEventRow>()
  for (const event of (reviewEvents ?? []) as ReviewEventRow[]) {
    if (!latestReopenByCampaign.has(event.campaign_id)) {
      latestReopenByCampaign.set(event.campaign_id, event)
    }
  }

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

  const approvedCount = Number(firstParam(params.approved) ?? 0)
  const reviewed = firstParam(params.reviewed) === '1'
  const needsSelection = firstParam(params.select) === '1'

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard?workspace=owner"
          className="text-sm font-bold text-blue-700 hover:text-blue-900"
        >
          ← Back to Owner Console
        </Link>

        <header className="mt-4 flex flex-col gap-3 rounded-2xl bg-slate-950 px-5 py-5 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-300">
              Trust and safety
            </p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">Campaign reviews</h1>
            <p className="mt-1 text-sm text-slate-300">
              Review what changed, confirm readiness, and make a decision.
            </p>
          </div>
          <div className="shrink-0 rounded-xl bg-white/10 px-4 py-3 text-center">
            <p className="text-2xl font-black">{queue.length}</p>
            <p className="text-xs font-bold text-slate-300">Needs attention</p>
          </div>
        </header>

        {reviewed || approvedCount > 0 ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            {approvedCount > 0
              ? `${approvedCount} campaign${approvedCount === 1 ? '' : 's'} approved.`
              : 'Campaign review saved.'}
          </div>
        ) : null}

        {needsSelection ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
            Select at least one campaign before approving selected items.
          </div>
        ) : null}

        {queue.length === 0 ? (
          <section className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-white px-5 py-4 shadow-sm">
            <div>
              <h2 className="font-black text-slate-950">Queue clear</h2>
              <p className="mt-1 text-sm text-slate-600">
                No campaigns currently require an Owner decision.
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
              All caught up
            </span>
          </section>
        ) : (
          <>
            <form id="bulk-approve-form" action={bulkApproveCampaignsAction}></form>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div>
                <p className="text-sm font-black text-slate-950">Bulk review</p>
                <p className="text-xs text-slate-500">Select straightforward approvals below.</p>
              </div>
              <button
                type="submit"
                form="bulk-approve-form"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700"
              >
                Approve selected
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {queue.map((campaign) => {
                const organization = organizationByLegacyId.get(campaign.organization_id)
                const stripe = organization
                  ? stripeByOrganizationId.get(organization.id)
                  : undefined
                const readiness = stripeReadiness(stripe)
                const reopenEvent = latestReopenByCampaign.get(campaign.id)
                const changeResults = reopenEvent?.check_results
                const changedFields = Object.entries(changeResults?.changed_fields ?? {})

                return (
                  <article
                    key={campaign.id}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <input
                      type="checkbox"
                      name="campaignIds"
                      value={campaign.id}
                      form="bulk-approve-form"
                      aria-label={`Select ${campaign.name} for bulk approval`}
                      className="mt-4 h-5 w-5 shrink-0 rounded border-slate-300 text-emerald-600"
                    />

                    <details className="group min-w-0 flex-1 overflow-hidden rounded-xl border border-transparent open:border-blue-100 open:bg-blue-50/30">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 marker:hidden">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate font-black text-slate-950">{campaign.name}</h2>
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black capitalize text-amber-900">
                              {campaign.review_status.replaceAll('_', ' ')}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                                readiness.ready
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {readiness.label}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm text-slate-600">
                            {organization?.name ?? 'Organization not linked'} ·{' '}
                            {formatMoney(Number(campaign.goal_amount ?? 0))} goal
                          </p>
                        </div>

                        <span className="shrink-0 text-sm font-black text-blue-700 group-open:hidden">
                          View details
                        </span>
                        <span className="hidden shrink-0 text-sm font-black text-blue-700 group-open:inline">
                          Hide
                        </span>
                      </summary>

                      <div className="border-t border-blue-100 px-3 pb-4 pt-4">
                        {reopenEvent ? (
                          <section className="mb-4 rounded-xl border border-violet-200 bg-violet-50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-black text-violet-950">What changed since the last approval</p>
                              {changeResults?.previous_content_revision && changeResults?.content_revision ? (
                                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-violet-800">
                                  Revision {changeResults.previous_content_revision} → {changeResults.content_revision}
                                </span>
                              ) : null}
                            </div>

                            {changedFields.length > 0 ? (
                              <div className="mt-3 space-y-3">
                                {changedFields.map(([field, change]) => (
                                  <div key={field} className="rounded-lg bg-white p-3 text-sm">
                                    <p className="font-bold text-slate-900">{FIELD_LABELS[field] ?? field.replaceAll('_', ' ')}</p>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                      <div>
                                        <p className="text-[11px] font-bold uppercase tracking-wide text-rose-700">Before</p>
                                        <p className="mt-1 whitespace-pre-wrap break-words text-slate-600">{formatChangedValue(field, change.before)}</p>
                                      </div>
                                      <div>
                                        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">After</p>
                                        <p className="mt-1 whitespace-pre-wrap break-words text-slate-900">{formatChangedValue(field, change.after)}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-sm leading-6 text-violet-900">
                                This revision was reopened after a material edit, but exact field details were not recorded for this older revision.
                              </p>
                            )}
                          </section>
                        ) : null}

                        <p className="text-sm leading-6 text-slate-700">
                          {campaign.description?.trim() || 'No campaign description provided.'}
                        </p>

                        <div className="mt-4 grid gap-3 rounded-xl bg-white p-4 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
                          <p><strong>Status</strong><br /><span className="capitalize">{campaign.status}</span></p>
                          <p><strong>Submitted</strong><br />{formatDate(campaign.review_submitted_at)}</p>
                          <p><strong>Beneficiary</strong><br />{campaign.beneficiary_name || 'Organization'}</p>
                          <p><strong>Relationship</strong><br />{campaign.beneficiary_relationship || 'Not specified'}</p>
                        </div>

                        {campaign.review_notes ? (
                          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
                            <strong>Previous review note:</strong> {campaign.review_notes}
                          </p>
                        ) : null}

                        <form action={reviewCampaignAction} className="mt-4">
                          <input type="hidden" name="campaignId" value={campaign.id} />
                          <label
                            className="block text-sm font-black text-slate-800"
                            htmlFor={`notes-${campaign.id}`}
                          >
                            Decision note
                          </label>
                          <textarea
                            id={`notes-${campaign.id}`}
                            name="notes"
                            rows={2}
                            placeholder="Required when requesting changes, rejecting, or suspending."
                            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />

                          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            <button name="decision" value="approved" className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700">Approve</button>
                            <button name="decision" value="changes_requested" className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-600">Request changes</button>
                            <button name="decision" value="rejected" className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-black text-white hover:bg-rose-700">Reject</button>
                            <button name="decision" value="suspended" className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-black text-white hover:bg-slate-950">Suspend</button>
                          </div>
                        </form>
                      </div>
                    </details>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
