import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

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
      <main className="mx-auto max-w-xl px-5 py-12 sm:px-6">
        <h1 className="text-3xl font-black text-slate-950">Business upgrade</h1>
        <p className="mt-3 leading-7 text-slate-600">
          No active Business workspace is connected to this account yet.
        </p>
        <Link
          href="/signup?role=business"
          className="mt-6 inline-flex rounded-xl bg-green-600 px-5 py-3 font-bold text-white"
        >
          Create a Business workspace
        </Link>
      </main>
    )
  }

  const admin = createAdminClient() as any
  const [{ data: business }, { data: billing }] = await Promise.all([
    admin
      .from('businesses')
      .select('id, name, subscription_tier, status, archived_at, is_demo, demo_group')
      .eq('id', membership.business_id)
      .maybeSingle(),
    admin
      .from('business_billing_accounts')
      .select('plan_code, subscription_status, cancel_at_period_end, current_period_end')
      .eq('business_id', membership.business_id)
      .maybeSingle(),
  ])

  if (!business) {
    return (
      <main className="mx-auto max-w-xl px-5 py-12 sm:px-6">
        <h1 className="text-3xl font-black text-slate-950">Business upgrade</h1>
        <p className="mt-3 text-slate-600">This Business workspace could not be loaded.</p>
        <Link href="/dashboard" className="mt-6 inline-flex font-bold text-blue-700">
          Back to dashboard
        </Link>
      </main>
    )
  }

  const billingState: BillingState = billing ?? {
    plan_code: 'free',
    subscription_status: 'inactive',
    cancel_at_period_end: false,
    current_period_end: null,
  }
  const isDemo =
    membership.is_demo !== false ||
    membership.demo_group !== null ||
    business.is_demo !== false ||
    business.demo_group !== null

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-green-700">
              {business.name}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Grow beyond the free plan
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Free businesses can keep up to 3 active offers. Growth removes that limit and unlocks the paid growth tier while community participation stays available on every plan.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700"
          >
            Back to Dashboard
          </Link>
        </div>

        {params.checkout === 'success' ? (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5 text-green-900">
            <p className="font-bold">Stripe Checkout completed.</p>
            <p className="mt-1 text-sm leading-6">
              RaiseHub activates Growth from signed Stripe subscription events. If the status below has not refreshed yet, return to the dashboard in a moment rather than purchasing again.
            </p>
          </div>
        ) : null}

        {params.checkout === 'canceled' ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <p className="font-bold">Checkout canceled.</p>
            <p className="mt-1 text-sm">No plan change was made.</p>
          </div>
        ) : null}

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_1.2fr] md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-700">Growth includes</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                <li>✓ More than 3 active offers</li>
                <li>✓ Growth-tier placement and promotion eligibility</li>
                <li>✓ Access to future paid marketing tools as they launch</li>
                <li>✓ Existing redemption and reporting history stays intact</li>
                <li>✓ Secure billing management through Stripe</li>
              </ul>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-bold text-slate-900">Current RaiseHub tier</p>
                <p className="mt-1 capitalize">{business.subscription_tier || 'free'}</p>
                <p className="mt-3 font-bold text-slate-900">Stripe status</p>
                <p className="mt-1 capitalize">{billingState.subscription_status.replaceAll('_', ' ')}</p>
              </div>
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

        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          Billing is processed by Stripe. RaiseHub does not store card numbers. Canceling at period end keeps Growth access through the paid billing period.
        </p>
      </div>
    </main>
  )
}
