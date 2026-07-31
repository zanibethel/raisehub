import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { updateSupportRequest } from './actions'

export const metadata = {
  title: 'Support Requests | RaiseHub Owner Console',
}

type SupportRequest = {
  id: string
  requester_name: string
  requester_email: string
  topic: string
  message: string
  source_page: string | null
  environment: 'production' | 'demo'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  internal_notes: string | null
  customer_reply: string | null
  created_at: string
  updated_at: string
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Unknown date'
    : date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
}

function statusLabel(status: SupportRequest['status']) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default async function OwnerSupportRequestsPage() {
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
    .from('support_requests')
    .select('id, requester_name, requester_email, topic, message, source_page, environment, status, internal_notes, customer_reply, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(100)

  const requests = (data ?? []) as SupportRequest[]
  const openCount = requests.filter((request) => request.status === 'open').length
  const activeCount = requests.filter((request) => request.status === 'in_progress').length
  const resolvedCount = requests.filter((request) => request.status === 'resolved').length

  return (
    <main className="min-h-screen bg-[#F0F6FF] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Owner Support Queue
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
            Support Requests
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Review customer messages, record private investigation notes, draft a response, and move each request through the support workflow.
          </p>
        </header>

        <section className="grid grid-cols-3 gap-3">
          {[
            ['Open', openCount, 'text-rose-700'],
            ['In progress', activeCount, 'text-blue-700'],
            ['Resolved', resolvedCount, 'text-emerald-700'],
          ].map(([label, count, tone]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">{label}</p>
              <p className={`mt-1 text-2xl font-black sm:text-3xl ${tone}`}>{count}</p>
            </div>
          ))}
        </section>

        {error ? (
          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
            Support requests could not be loaded.
          </section>
        ) : null}

        {!error && requests.length === 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-black text-slate-950">No support requests yet</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              New Contact Us submissions will appear here automatically.
            </p>
          </section>
        ) : null}

        <section className="space-y-4">
          {requests.map((request) => (
            <article key={request.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                      {request.topic}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {request.environment === 'demo' ? 'Demo' : 'Live'}
                    </span>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                      {statusLabel(request.status)}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-black text-slate-950">{request.requester_name}</h2>
                  <a href={`mailto:${request.requester_email}`} className="mt-1 block break-all text-sm font-bold text-blue-700">
                    {request.requester_email}
                  </a>
                  <p className="mt-1 text-xs text-slate-500">Received {formatDate(request.created_at)}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{request.message}</p>
                {request.source_page ? (
                  <p className="mt-3 break-all text-xs text-slate-500">Source: {request.source_page}</p>
                ) : null}
              </div>

              <form action={updateSupportRequest} className="mt-5 grid gap-4 lg:grid-cols-2">
                <input type="hidden" name="id" value={request.id} />

                <label className="block lg:col-span-2">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-600">Status</span>
                  <select
                    name="status"
                    defaultValue={request.status}
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-600">Internal notes</span>
                  <textarea
                    name="internal_notes"
                    defaultValue={request.internal_notes ?? ''}
                    rows={6}
                    placeholder="Private investigation details, account context, or next steps."
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-900"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-600">Customer reply draft</span>
                  <textarea
                    name="customer_reply"
                    defaultValue={request.customer_reply ?? ''}
                    rows={6}
                    placeholder="Draft the customer-facing response here. Saving does not send an email yet."
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-900"
                  />
                </label>

                <div className="lg:col-span-2">
                  <button
                    type="submit"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-700 px-5 text-sm font-black text-white hover:bg-blue-800 sm:w-auto"
                  >
                    Save support update
                  </button>
                </div>
              </form>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
