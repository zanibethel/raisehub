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
    .select('id, address, label, bucket, display_name, forward_to, is_active, accepts_inbound')
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
            Manage which real people should receive copies of messages routed into each RaiseHub inbox. Incoming mail still stays in the Owner Support Center as the source of truth.
          </p>
        </header>

        {error ? (
          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
            Email routes could not be loaded.
          </section>
        ) : null}

        <section className="space-y-4">
          {routes.map((route) => (
            <form
              key={route.id}
              action={updateSupportEmailRoute}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <input type="hidden" name="id" value={route.id} />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                  Active
                </label>
              </div>

              <label className="mt-5 block">
                <span className="text-xs font-black uppercase tracking-wide text-slate-600">
                  Forward copies to
                </span>
                <textarea
                  name="forward_to"
                  rows={3}
                  defaultValue={(route.forward_to ?? []).join('\n')}
                  placeholder="owner@example.com\nsupport-team@example.com"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-900"
                />
                <span className="mt-2 block text-xs leading-5 text-slate-500">
                  One address per line, or separate addresses with commas. Leave blank to keep the message only in RaiseHub.
                </span>
              </label>

              <button
                type="submit"
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-black text-white hover:bg-slate-800"
              >
                Save routing
              </button>
            </form>
          ))}
        </section>
      </div>
    </main>
  )
}
