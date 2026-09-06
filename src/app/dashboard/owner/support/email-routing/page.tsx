import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { updateSupportEmailRoute } from './actions'

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

export default async function OwnerEmailRoutingPage() {
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

  const { data, error } = await supabase
    .from('support_email_routes')
    .select('id, address, label, bucket, display_name, forward_to, forward_enabled, is_active, accepts_inbound')
    .order('address')

  const routes = (data ?? []) as SupportEmailRoute[]

  return (
    <main className="min-h-screen bg-[#F0F6FF] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
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
            RaiseHub email buckets
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Every inbound message stays in RaiseHub. You decide bucket by bucket whether copies should also be forwarded to outside team members, and each bucket can hold multiple recipient addresses as your support team grows.
          </p>
        </header>

        {error ? (
          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
            Email routes could not be loaded.
          </section>
        ) : null}

        <section className="space-y-4">
          {routes.map((route) => {
            const recipients = route.forward_to ?? []

            return (
              <form
                key={route.id}
                action={updateSupportEmailRoute}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <input type="hidden" name="id" value={route.id} />

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
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
                    <p className="mt-1 text-sm text-slate-500">
                      Sender name: {route.display_name}
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      name="is_active"
                      defaultChecked={route.is_active}
                      className="h-5 w-5"
                    />
                    Address active
                  </label>
                </div>

                {route.accepts_inbound ? (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-900">External forwarding</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          RaiseHub remains the source of truth even when outside copies are enabled.
                        </p>
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                        <input
                          type="checkbox"
                          name="forward_enabled"
                          defaultChecked={route.forward_enabled}
                          className="h-5 w-5"
                        />
                        Forward this bucket
                      </label>
                    </div>

                    <label className="mt-4 block">
                      <span className="text-xs font-black uppercase tracking-wide text-slate-600">
                        Team recipients ({recipients.length})
                      </span>
                      <textarea
                        name="forward_to"
                        rows={Math.max(3, Math.min(8, recipients.length + 1))}
                        defaultValue={recipients.join('\n')}
                        placeholder="owner@example.com\nsupport-one@example.com\nsupport-two@example.com"
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-900"
                      />
                      <span className="mt-2 block text-xs leading-5 text-slate-500">
                        Add up to 50 addresses. Use one per line, commas, or semicolons. Duplicate addresses are removed automatically. Turning forwarding off keeps the list saved without sending outside copies.
                      </span>
                    </label>

                    {recipients.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
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
                ) : (
                  <input type="hidden" name="forward_to" value="" />
                )}

                <button
                  type="submit"
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-black text-white hover:bg-slate-800"
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
