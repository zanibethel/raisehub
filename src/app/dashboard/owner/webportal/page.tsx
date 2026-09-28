import Link from 'next/link'
import { redirect } from 'next/navigation'

import OwnerWorkspaceShell from '@/components/dashboards/owner/owner-workspace-shell'
import WebPortalAdControls from '@/components/dashboards/owner/webportal-ad-controls'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'WebPortal Admin | RaiseHub Owner Console',
}

type WebPortalAdOrder = {
  id: string
  business_name: string
  contact_email: string
  ad_text: string
  destination_url: string
  logo_url: string | null
  plan_code: string
  amount_cents: number
  duration_days: number
  recurring: boolean
  status: string
  purchased_at: string | null
  approved_at: string | null
  activated_at: string | null
  ends_at: string | null
  subscription_status: string | null
  review_note: string | null
  rejected_at: string | null
  deactivated_at: string | null
  created_at: string
}

type SupportPayment = {
  amount_cents: number
  paid_at: string | null
}

function money(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Chicago',
  }).format(new Date(value))
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    checkout_open: 'Checkout open',
    checkout_failed: 'Checkout failed',
    checkout_expired: 'Checkout expired',
    paid_pending_review: 'Pending review',
    approved: 'Approved',
    active: 'Active',
    rejected: 'Rejected',
    expired: 'Expired',
    canceled: 'Canceled',
  }

  return labels[status] ?? status.replaceAll('_', ' ')
}

function statusClasses(status: string) {
  if (status === 'paid_pending_review') return 'bg-amber-100 text-amber-800'
  if (status === 'active') return 'bg-emerald-100 text-emerald-800'
  if (status === 'rejected' || status === 'canceled') return 'bg-rose-100 text-rose-800'
  return 'bg-slate-100 text-slate-700'
}

export default async function WebPortalOwnerAdminPage() {
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
  const [ordersResult, supportResult] = await Promise.all([
    admin
      .from('webportal_ad_orders')
      .select(
        'id, business_name, contact_email, ad_text, destination_url, logo_url, plan_code, amount_cents, duration_days, recurring, status, purchased_at, approved_at, activated_at, ends_at, subscription_status, review_note, rejected_at, deactivated_at, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('webportal_support_payments')
      .select('amount_cents, paid_at')
      .eq('payment_status', 'paid')
      .order('paid_at', { ascending: false })
      .limit(500),
  ])

  const orders = (ordersResult.data ?? []) as WebPortalAdOrder[]
  const supportPayments = (supportResult.data ?? []) as SupportPayment[]

  const pending = orders.filter((order) => order.status === 'paid_pending_review')
  const active = orders.filter((order) => order.status === 'active')
  const history = orders.filter(
    (order) =>
      order.status !== 'paid_pending_review' && order.status !== 'active'
  )

  const supportTotal = supportPayments.reduce(
    (sum, payment) => sum + Number(payment.amount_cents ?? 0),
    0
  )
  const paidAdOrders = orders.filter((order) =>
    ['paid_pending_review', 'approved', 'active', 'expired', 'canceled'].includes(
      order.status
    )
  )
  const initialAdRevenue = paidAdOrders.reduce(
    (sum, order) => sum + Number(order.amount_cents ?? 0),
    0
  )

  const loadError = ordersResult.error || supportResult.error

  return (
    <OwnerWorkspaceShell view="manage" detail="WebPortal Admin">
      <div className="mt-8 space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
                WebPortal
              </p>
              <h1 className="mt-2 text-3xl font-black text-slate-950">
                Ads & support
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Review paid TV banner ads, activate approved placements, remove ads from rotation,
                and keep an eye on WebPortal support payments.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/webportal/advertise"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800"
              >
                Ad purchase page
              </Link>
              <Link
                href="/webportal/support"
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white"
              >
                Support page
              </Link>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[11px] font-black uppercase tracking-wide text-amber-700">
              Pending review
            </p>
            <p className="mt-1 text-3xl font-black text-slate-950">{pending.length}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700">
              Active ads
            </p>
            <p className="mt-1 text-3xl font-black text-slate-950">{active.length}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-[11px] font-black uppercase tracking-wide text-blue-700">
              Initial ad sales
            </p>
            <p className="mt-1 text-2xl font-black text-slate-950">
              {money(initialAdRevenue)}
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
            <p className="text-[11px] font-black uppercase tracking-wide text-cyan-700">
              App support
            </p>
            <p className="mt-1 text-2xl font-black text-slate-950">
              {money(supportTotal)}
            </p>
          </div>
        </section>

        {loadError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
            Some WebPortal data could not be loaded: {loadError.message}
          </div>
        ) : null}

        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                Needs attention
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Paid ads awaiting review
              </h2>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
              {pending.length}
            </span>
          </div>

          <div className="mt-3 space-y-4">
            {pending.length ? (
              pending.map((order) => (
                <article
                  key={order.id}
                  className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-black text-slate-950">
                          {order.business_name}
                        </h3>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${statusClasses(order.status)}`}>
                          {statusLabel(order.status)}
                        </span>
                        {order.recurring ? (
                          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-black text-violet-800">
                            Recurring
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-sm text-slate-600">
                        {money(order.amount_cents)} · {order.duration_days} days · {order.contact_email}
                      </p>

                      <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-white">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">
                          TV banner preview
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <div
                            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-400/40 bg-slate-900 bg-cover bg-center text-sm font-black text-cyan-200"
                            style={
                              order.logo_url
                                ? { backgroundImage: `url("${order.logo_url.replaceAll('"', '%22')}")` }
                                : undefined
                            }
                            aria-label={
                              order.logo_url
                                ? `${order.business_name} logo`
                                : `${order.business_name} initials`
                            }
                          >
                            {order.logo_url
                              ? null
                              : order.business_name
                                  .split(/\s+/)
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((part) => part[0]?.toUpperCase() ?? '')
                                  .join('')}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-base font-black">{order.business_name}</p>
                            <p className="mt-1 text-sm font-bold text-slate-100">{order.ad_text}</p>
                          </div>
                        </div>
                        <p className="mt-3 break-all text-xs text-slate-300">
                          QR → {order.destination_url}
                        </p>
                      </div>

                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="font-black text-slate-500">Paid</dt>
                          <dd className="mt-1 text-slate-800">{formatDate(order.purchased_at)}</dd>
                        </div>
                        <div>
                          <dt className="font-black text-slate-500">Order</dt>
                          <dd className="mt-1 break-all font-mono text-xs text-slate-600">{order.id}</dd>
                        </div>
                      </dl>
                    </div>

                    <WebPortalAdControls
                      orderId={order.id}
                      status={order.status}
                      recurring={order.recurring}
                    />
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                No paid WebPortal ads are waiting for review.
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                Live rotation
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Active ads</h2>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
              {active.length}
            </span>
          </div>

          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {active.length ? (
              active.map((order) => (
                <article
                  key={order.id}
                  className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-slate-950">{order.business_name}</h3>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-800">
                      Active
                    </span>
                    {order.recurring ? (
                      <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-black text-violet-800">
                        {order.subscription_status || 'Recurring'}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-950 bg-cover bg-center text-xs font-black text-cyan-200"
                      style={
                        order.logo_url
                          ? { backgroundImage: `url("${order.logo_url.replaceAll('"', '%22')}")` }
                          : undefined
                      }
                    >
                      {order.logo_url
                        ? null
                        : order.business_name
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase() ?? '')
                            .join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{order.ad_text}</p>
                      <p className="mt-1 break-all text-xs text-slate-500">{order.destination_url}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="font-black text-slate-500">Activated</p>
                      <p className="mt-1 text-slate-800">{formatDate(order.activated_at)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="font-black text-slate-500">Current period ends</p>
                      <p className="mt-1 text-slate-800">{formatDate(order.ends_at)}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <WebPortalAdControls
                      orderId={order.id}
                      status={order.status}
                      recurring={order.recurring}
                    />
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 lg:col-span-2">
                No paid WebPortal ads are active yet.
              </div>
            )}
          </div>
        </section>

        <details className="group rounded-3xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                History
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Previous WebPortal ad orders
              </h2>
            </div>
            <span className="text-2xl font-black text-slate-400 transition group-open:rotate-45">
              +
            </span>
          </summary>

          <div className="border-t border-slate-200 p-4 sm:p-6">
            {history.length ? (
              <div className="space-y-3">
                {history.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-black text-slate-950">{order.business_name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {money(order.amount_cents)} · {order.contact_email}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${statusClasses(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                    </div>
                    {order.review_note ? (
                      <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                        {order.review_note}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">No completed WebPortal ad history yet.</p>
            )}
          </div>
        </details>
      </div>
    </OwnerWorkspaceShell>
  )
}
