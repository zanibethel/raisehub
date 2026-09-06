import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createSupportEmailRoute, updateSupportEmailRoute } from './actions'
import CreateRouteSubmitButton from './create-route-submit-button'

export const metadata = {
  title: 'Email Routing | RaiseHub Owner Console',
}

type SupportEmailRoute = {
  id: string
  address: string
  label: string
  bucket: string
  display_name: string
  forward_to: string[] | null
  forward_enabled: boolean
  is_active: boolean
  accepts_inbound: boolean
}

type PageProps = {
  searchParams: Promise<{
    created?: string
    error?: string
  }>
}

function errorMessage(code?: string) {
  switch (code) {
    case 'invalid-address':
      return 'Use a valid RaiseHub mailbox name such as social, media, or careers.'
    case 'invalid-bucket':
      return 'That mailbox name cannot be converted into a routing bucket. Try a simple name such as social.'
    case 'missing-details':
      return 'Add both a route label and sender display name.'
    case 'route-exists':
      return 'That email route or routing bucket already exists.'
    default:
      return null
  }
}

export default async function OwnerEmailRoutingPage({ searchParams }: PageProps) {
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

  const [{ data, error }, params] = await Promise.all([
    supabase
      .from('support_email_routes')
      .select('id, address, label, bucket, display_name, forward_to, forward_enabled, is_active, accepts_inbound')
      .order('address'),
    searchParams,
  ])

  const routes = (data ?? []) as SupportEmailRoute[]
  const routeError = errorMessage(params.error)

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F0F6FF] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto min-w-0 max-w-5xl space-y-6">
        <header className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <Link
            href="/dashboard/owner/support"
            className="text-sm font-bold text-blue-700 hover:text-blue-900"
          >
            ← Support Center
          </Link>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Owner Mail Routing
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
            RaiseHub email routes
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Every inbound message stays in RaiseHub. Create new @raisehub.app mailboxes as needed, route them into their own inbox bucket, and optionally forward copies to outside team members.
          </p>
        </header>

        {params.created ? (
          <section className="min-w-0 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            ✓ {params.created} is active in RaiseHub routing. You can use it now for inbound mail and test forwarding below.
          </section>
        ) : null}

        {routeError ? (
          <section className="min-w-0 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
            {routeError}
          </section>
        ) : null}

        <details className="min-w-0 overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-sm" open>
          <summary className="flex min-h-16 min-w-0 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">New mailbox</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Add new email route</h2>
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">@raisehub.app</span>
          </summary>

          <form action={createSupportEmailRoute} className="grid min-w-0 gap-4 border-t border-blue-100 p-5 sm:grid-cols-2 sm:p-6">
            <label className="block min-w-0 sm:col-span-2">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600">Email address</span>
              <div className="mt-2 flex min-h-12 min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-blue-500">
                <input
                  name="local_part"
                  required
                  maxLength={63}
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="social"
                  className="min-w-0 flex-1 px-3 text-sm font-bold text-slate-900 outline-none"
                />
                <span className="flex shrink-0 items-center border-l border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-500 sm:px-3 sm:text-sm">
                  @raisehub.app
                </span>
              </div>
              <span className="mt-2 block break-words text-xs leading-5 text-slate-500">
                The mailbox name also creates its routing bucket automatically. For example, social@raisehub.app becomes the Social inbox route.
              </span>
            </label>

            <label className="block min-w-0">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600">Route label</span>
              <input
                name="label"
                required
                maxLength={80}
                placeholder="Social"
                className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900"
              />
            </label>

            <label className="block min-w-0">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600">Sender display name</span>
              <input
                name="display_name"
                required
                maxLength={120}
                placeholder="RaiseHub Social"
                className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900"
              />
            </label>

            <div className="grid min-w-0 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2 sm:grid-cols-3">
              <label className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-slate-700">
                <input type="checkbox" name="is_active" defaultChecked className="h-5 w-5 shrink-0" />
                Address active
              </label>
              <label className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-slate-700">
                <input type="checkbox" name="accepts_inbound" defaultChecked className="h-5 w-5 shrink-0" />
                Accept inbound email
              </label>
              <label className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-slate-700">
                <input type="checkbox" name="forward_enabled" className="h-5 w-5 shrink-0" />
                Forward externally
              </label>
            </div>

            <label className="block min-w-0 sm:col-span-2">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600">External forwarding recipients</span>
              <textarea
                name="forward_to"
                rows={3}
                placeholder="zanibethel@gmail.com"
                className="mt-2 w-full min-w-0 max-w-full resize-y rounded-xl border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-900"
              />
              <span className="mt-2 block break-words text-xs leading-5 text-slate-500">
                Optional. Add up to 50 addresses using one per line, commas, or semicolons. If forwarding is enabled, replies from these saved addresses are recognized as authorized team replies and are sent back to the original customer from this RaiseHub mailbox.
              </span>
            </label>

            <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 break-words text-xs leading-5 text-emerald-900">
                No separate mailbox provider setup is required for each new address. RaiseHub domain receiving is already connected; saving this route authorizes the existing inbound webhook and forwarding system to recognize it.
              </p>
              <div className="shrink-0">
                <CreateRouteSubmitButton />
              </div>
            </div>
          </form>
        </details>

        {error ? (
          <section className="min-w-0 rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
            Email routes could not be loaded.
          </section>
        ) : null}

        <section className="min-w-0 space-y-4">
          {routes.map((route) => {
            const recipients = route.forward_to ?? []

            return (
              <form
                key={route.id}
                action={updateSupportEmailRoute}
                className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <input type="hidden" name="id" value={route.id} />

                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                        {route.label}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        {route.bucket}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${route.accepts_inbound ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {route.accepts_inbound ? 'Inbound' : 'Outbound only'}
                      </span>
                      {route.accepts_inbound ? (
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${route.forward_enabled ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                          {route.forward_enabled ? 'External forwarding on' : 'In-app only'}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-3 break-all text-xl font-black text-slate-950">
                      {route.address}
                    </h2>
                    <p className="mt-1 break-words text-sm text-slate-500">
                      Sender name: {route.display_name}
                    </p>
                  </div>

                  <label className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      name="is_active"
                      defaultChecked={route.is_active}
                      className="h-5 w-5 shrink-0"
                    />
                    Address active
                  </label>
                </div>

                {route.accepts_inbound ? (
                  <details className="mt-5 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <summary className="flex min-h-16 min-w-0 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900">
                          Team recipients ({recipients.length})
                        </p>
                        <p className="mt-1 truncate text-xs leading-5 text-slate-500">
                          {route.forward_enabled
                            ? `Forwarding on${recipients.length > 0 ? ` · ${recipients[0]}${recipients.length > 1 ? ` +${recipients.length - 1}` : ''}` : ''}`
                            : 'External forwarding is off'}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-slate-200">
                        Manage
                      </span>
                    </summary>

                    <div className="min-w-0 border-t border-slate-200 p-4">
                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900">External forwarding</p>
                          <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                            RaiseHub remains the source of truth even when outside copies are enabled.
                          </p>
                        </div>
                        <label className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-slate-700">
                          <input
                            type="checkbox"
                            name="forward_enabled"
                            defaultChecked={route.forward_enabled}
                            className="h-5 w-5 shrink-0"
                          />
                          Forward this bucket
                        </label>
                      </div>

                      <label className="mt-4 block min-w-0">
                        <span className="text-xs font-black uppercase tracking-wide text-slate-600">
                          Team recipients ({recipients.length})
                        </span>
                        <textarea
                          name="forward_to"
                          rows={Math.max(3, Math.min(8, recipients.length + 1))}
                          defaultValue={recipients.join('\n')}
                          placeholder="owner@example.com\nsupport-one@example.com\nsupport-two@example.com"
                          className="mt-2 w-full min-w-0 max-w-full resize-y rounded-xl border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-900"
                        />
                        <span className="mt-2 block break-words text-xs leading-5 text-slate-500">
                          Add up to 50 addresses. Use one per line, commas, or semicolons. Duplicate addresses are removed automatically. Turning forwarding off keeps the list saved without sending outside copies.
                        </span>
                      </label>

                      {recipients.length > 0 ? (
                        <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                          {recipients.map((recipient) => (
                            <span
                              key={recipient}
                              className="max-w-full break-all rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200"
                            >
                              {recipient}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </details>
                ) : (
                  <input type="hidden" name="forward_to" value="" />
                )}

                <button
                  type="submit"
                  className="mt-4 inline-flex min-h-11 max-w-full items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-black text-white hover:bg-slate-800"
                >
                  Save routing
                </button>
              </form>
            )
          })}
        </section>
      </div>
    </main>
  )
}
