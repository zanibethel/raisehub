import Link from 'next/link'
import { redirect } from 'next/navigation'

import { refreshBusinessBillingFromStripe } from '@/lib/stripe/business-billing-refresh'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

import BusinessWorkspaceContext from './business-workspace-context'
import UpgradeActions from './upgrade-actions'

type UpgradePageProps = {
  searchParams: Promise<{
    business?: string
    checkout?: string
  }>
}

type BillingState = {
  plan_code: string
  subscription_status: string
  cancel_at_period_end: boolean
  current_period_end: string | null
}

function periodEndLabel(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function UpgradePage({ searchParams }: UpgradePageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent('/upgrade')}`)
  }

  const { data: memberships } = await (supabase as any)
    .from('business_memberships')
    .select('business_id, status, is_demo, demo_group')
    .eq('user_id', user.id)
    .eq('status', 'active')

  const activeMemberships = memberships ?? []
  const requestedMembership = params.business
    ? activeMemberships.find(
        (membership: { business_id: string }) =>
          membership.business_id === params.business
      )
    : null
  const membership = requestedMembership ?? activeMemberships[0] ?? null

  if (!membership) {
    return (
      <main className="min-h-screen bg-[#F7FAFC] px-3 py-10 text-slate-950 sm:px-6">
        <div className="mx-auto max-w-xl">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
            Business Growth
          </p>
          <h1 className="mt-2 text-3xl font-black">No Business workspace yet</h1>
          <p className="mt-3 leading-7 text-slate-600">
            Connect or create a Business workspace before reviewing Growth billing.
          </p>
          <Link
            href="/signup/business"
            className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-green-700 px-5 text-sm font-black text-white"
          >
            Create Business Workspace
          </Link>
        </div>
      </main>
    )
  }

  const admin = createAdminClient() as any
  const { data: business } = await admin
    .from('businesses')
    .select('id, name, subscription_tier, status, archived_at, is_demo, demo_group')
    .eq('id', membership.business_id)
    .maybeSingle()

  if (!business) {
    return (
      <main className="min-h-screen bg-[#F7FAFC] px-3 py-10 text-slate-950 sm:px-6">
        <div className="mx-auto max-w-xl">
          <h1 className="text-3xl font-black">Business upgrade</h1>
          <p className="mt-3 text-slate-600">
            This Business workspace could not be loaded.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex min-h-11 items-center font-black text-blue-700"
          >
            ← Back to dashboard
          </Link>
        </div>
      </main>
    )
  }

  const isDemo =
    membership.is_demo !== false ||
    membership.demo_group !== null ||
    business.is_demo !== false ||
    business.demo_group !== null

  if (!isDemo) {
    try {
      await refreshBusinessBillingFromStripe(admin, business.id)
    } catch (error) {
      console.error('Could not refresh Business billing state from Stripe', error)
    }
  }

  const { data: billing } = await admin
    .from('business_billing_accounts')
    .select('plan_code, subscription_status, cancel_at_period_end, current_period_end')
    .eq('business_id', membership.business_id)
    .maybeSingle()

  const billingState: BillingState = billing ?? {
    plan_code: 'free',
    subscription_status: 'inactive',
    cancel_at_period_end: false,
    current_period_end: null,
  }

  const currentPeriodEnd = periodEndLabel(billingState.current_period_end)
  const businessWorkspaceKey = `business:${business.id}`
  const businessDashboardHref = `/dashboard?workspace=${encodeURIComponent(
    businessWorkspaceKey
  )}`

  return (
    <>
      <BusinessWorkspaceContext workspaceKey={businessWorkspaceKey} />
      <main className="min-h-screen bg-[#F7FAFC] px-3 py-6 text-slate-950 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-3xl">
          <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-7 text-white shadow-xl sm:px-8 sm:py-9">
            <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-green-500/20 blur-3xl" />
            <div className="relative z-10">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-green-300">
                {business.name}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Grow beyond the free plan
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Free businesses can keep up to 3 active offers. Growth removes that limit and adds paid growth tools while community participation stays available on every plan.
              </p>
              <Link
                href={businessDashboardHref}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-black text-white"
              >
                Back to Dashboard
              </Link>
            </div>
          </section>

          {params.checkout === 'success' ? (
            <div className="mt-5 border-y border-green-200 bg-green-50 px-4 py-4 text-green-900">
              <p className="font-black">Stripe Checkout completed.</p>
              <p className="mt-1 text-sm leading-6">
                RaiseHub activates Growth from signed Stripe subscription events. If the status below has not refreshed yet, return to the dashboard in a moment rather than purchasing again.
              </p>
            </div>
          ) : null}

          {params.checkout === 'canceled' ? (
            <div className="mt-5 border-y border-amber-200 bg-amber-50 px-4 py-4 text-amber-900">
              <p className="font-black">Checkout canceled.</p>
              <p className="mt-1 text-sm">No plan change was made.</p>
            </div>
          ) : null}

          {billingState.cancel_at_period_end ? (
            <div className="mt-5 border-y border-amber-200 bg-amber-50 px-4 py-4 text-amber-950">
              <p className="font-black">Growth cancellation scheduled</p>
              <p className="mt-1 text-sm leading-6">
                Your subscription will not renew
                {currentPeriodEnd
                  ? ` after ${currentPeriodEnd}`
                  : ' after the current billing period'}
                . Growth remains active until then.
              </p>
            </div>
          ) : null}

          <section className="mt-8">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
              Growth includes
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              More capacity without losing your existing setup
            </h2>

            <div className="mt-5 grid gap-6 md:grid-cols-[1fr_1.1fr] md:items-start">
              <div>
                <ul className="space-y-3 text-sm leading-6 text-slate-700">
                  <li>✓ More than 3 active offers</li>
                  <li>✓ Growth-tier placement and promotion eligibility</li>
                  <li>✓ Access to future paid marketing tools as they launch</li>
                  <li>✓ Existing redemption and reporting history stays intact</li>
                  <li>✓ Secure billing management through Stripe</li>
                </ul>

                <dl className="mt-6 divide-y divide-slate-200 border-y border-slate-200 text-sm">
                  <div className="py-3">
                    <dt className="font-black text-slate-900">Current RaiseHub tier</dt>
                    <dd className="mt-1 capitalize text-slate-600">
                      {business.subscription_tier || 'free'}
                    </dd>
                  </div>
                  <div className="py-3">
                    <dt className="font-black text-slate-900">Stripe status</dt>
                    <dd className="mt-1 capitalize text-slate-600">
                      {billingState.subscription_status.replaceAll('_', ' ')}
                    </dd>
                  </div>
                  <div className="py-3">
                    <dt className="font-black text-slate-900">Renewal</dt>
                    <dd className="mt-1 text-slate-600">
                      {billingState.cancel_at_period_end
                        ? `Cancels${currentPeriodEnd ? ` ${currentPeriodEnd}` : ' at period end'}`
                        : currentPeriodEnd
                          ? `Renews after ${currentPeriodEnd}`
                          : 'Active'}
                    </dd>
                  </div>
                </dl>
              </div>

              <UpgradeActions
                businessId={business.id}
                currentPlanCode={billingState.plan_code}
                subscriptionStatus={billingState.subscription_status}
                cancelAtPeriodEnd={billingState.cancel_at_period_end}
                currentPeriodEnd={billingState.current_period_end}
                isDemo={isDemo}
              />
            </div>
          </section>

          <p className="mt-6 border-t border-slate-200 pt-4 text-center text-xs leading-5 text-slate-500">
            Billing is processed by Stripe. RaiseHub does not store card numbers. Canceling at period end keeps Growth access through the paid billing period.
          </p>
        </div>
      </main>
    </>
  )
}
