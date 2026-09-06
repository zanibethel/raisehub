import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { updateSupportRequest } from './actions'
import SupportRequestSubmitButtons from './support-request-submit-buttons'

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
  channel: string
  bucket: string
  inbound_to: string | null
  reply_from_email: string | null
  internal_notes: string | null
  customer_reply: string | null
  customer_reply_sent_at: string | null
  created_at: string
  updated_at: string
}

type SupportMessage = {
  id: string
  support_request_id: string
  direction: 'inbound' | 'outbound' | 'internal'
  sender_email: string | null
  recipient_emails: string[] | null
  subject: string | null
  body_text: string | null
  created_by: string | null
  created_at: string
}

type SupportRoute = {
  address: string
  label: string
  bucket: string
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

function formatInboxDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (sameDay) {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function statusLabel(status: SupportRequest['status']) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function channelLabel(request: SupportRequest) {
  if (request.channel === 'email' || request.source_page === 'email') return 'Email'
  return 'RaiseHub app'
}

function messageLabel(message: SupportMessage) {
  if (message.direction === 'inbound') return 'Customer · Email'
  if (message.direction === 'internal') return 'Internal note'
  return message.created_by ? 'Owner reply · RaiseHub' : 'Support team reply · Email'
}

function latestPreview(request: SupportRequest, messages: SupportMessage[]) {
  const latest = messages.at(-1)
  const content = latest?.body_text || request.message || ''
  return content.replace(/\s+/g, ' ').trim().slice(0, 150)
}

function SupportRequestForm({
  request,
  routes,
}: {
  request: SupportRequest
  routes: SupportRoute[]
}) {
  return (
    <form action={updateSupportRequest} className="grid gap-4 lg:grid-cols-2">
      <input type="hidden" name="id" value={request.id} />

      <label className="block">
        <span className="text-xs font-black uppercase tracking-wide text-slate-600">Reply from</span>
        <select
          name="bucket"
          defaultValue={request.bucket}
          className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900"
        >
          {routes.map((route) => (
            <option key={route.address} value={route.bucket}>
              {route.label} · {route.address}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">Changing this also moves the thread into that inbox bucket.</p>
      </label>

      <label className="block">
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
          rows={4}
          placeholder="Private investigation details, account context, or next steps."
          className="mt-2 w-full rounded-xl border border-amber-200 bg-amber-50/40 p-3 text-sm leading-6 text-slate-900"
        />
      </label>

      <label className="block">
        <span className="text-xs font-black uppercase tracking-wide text-slate-600">Reply to customer</span>
        <textarea
          name="customer_reply"
          defaultValue={request.status === 'closed' ? '' : request.customer_reply ?? ''}
          rows={4}
          placeholder="Write the customer-facing response here."
          className="mt-2 w-full rounded-xl border border-blue-200 bg-white p-3 text-sm leading-6 text-slate-900"
        />
      </label>

      <SupportRequestSubmitButtons />
    </form>
  )
}

function ConversationThread({
  request,
  messages,
}: {
  request: SupportRequest
  messages: SupportMessage[]
}) {
  const hasInboundMessage = messages.some((message) => message.direction === 'inbound')

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Email thread</p>
          <p className="mt-0.5 text-xs text-slate-500">Complete conversation history</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-600 shadow-sm">
          {messages.length + (hasInboundMessage ? 0 : 1)} {messages.length + (hasInboundMessage ? 0 : 1) === 1 ? 'message' : 'messages'}
        </span>
      </div>

      <div className="space-y-3">
        {!hasInboundMessage ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black text-slate-900">{request.requester_name}</p>
                <p className="text-[11px] text-slate-500">{request.requester_email}</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">{formatDate(request.created_at)}</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">{request.message}</p>
          </div>
        ) : null}

        {messages.map((message) => {
          const outbound = message.direction === 'outbound'
          const internal = message.direction === 'internal'

          return (
            <div
              key={message.id}
              className={`rounded-2xl border p-4 shadow-sm ${
                internal
                  ? 'border-amber-200 bg-amber-50'
                  : outbound
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className={`text-xs font-black ${internal ? 'text-amber-800' : outbound ? 'text-blue-800' : 'text-slate-900'}`}>
                    {messageLabel(message)}
                  </p>
                  {message.sender_email ? (
                    <p className="mt-0.5 break-all text-[11px] text-slate-500">From: {message.sender_email}</p>
                  ) : null}
                  {message.recipient_emails?.length ? (
                    <p className="mt-0.5 break-all text-[11px] text-slate-500">To: {message.recipient_emails.join(', ')}</p>
                  ) : null}
                </div>
                <span className="text-[11px] font-semibold text-slate-500">{formatDate(message.created_at)}</span>
              </div>
              {message.subject ? <p className="mt-2 text-xs font-bold text-slate-700">{message.subject}</p> : null}
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                {message.body_text || 'Message body unavailable.'}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
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

  const [{ data, error }, { data: routeData }] = await Promise.all([
    supabase
      .from('support_requests')
      .select('id, requester_name, requester_email, topic, message, source_page, environment, status, channel, bucket, inbound_to, reply_from_email, internal_notes, customer_reply, customer_reply_sent_at, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(100),
    supabase
      .from('support_email_routes')
      .select('address, label, bucket')
      .eq('is_active', true)
      .eq('accepts_inbound', true)
      .neq('bucket', 'notifications')
      .order('label'),
  ])

  const requests = (data ?? []) as SupportRequest[]
  const routes = (routeData ?? []) as SupportRoute[]
  const requestIds = requests.map((request) => request.id)

  let messageRows: SupportMessage[] = []
  if (requestIds.length > 0) {
    const { data: messages } = await supabase
      .from('support_request_messages')
      .select('id, support_request_id, direction, sender_email, recipient_emails, subject, body_text, created_by, created_at')
      .in('support_request_id', requestIds)
      .order('created_at', { ascending: true })

    messageRows = (messages ?? []) as SupportMessage[]
  }

  const messagesByRequest = new Map<string, SupportMessage[]>()
  for (const message of messageRows) {
    const current = messagesByRequest.get(message.support_request_id) ?? []
    current.push(message)
    messagesByRequest.set(message.support_request_id, current)
  }

  const openCount = requests.filter((request) => request.status === 'open').length
  const activeCount = requests.filter((request) => request.status === 'in_progress').length
  const resolvedCount = requests.filter((request) => request.status === 'resolved').length

  return (
    <main className="min-h-screen bg-[#F0F6FF] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Owner Support Queue</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Support Inbox</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Scan requests like an email inbox, open a thread when you need the full history, and reply from the correct RaiseHub address.
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
            <p className="mt-2 text-sm leading-6 text-slate-600">New customer messages will appear here automatically.</p>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {requests.map((request, index) => {
            const completed = request.status === 'closed' && Boolean(request.customer_reply_sent_at)
            const messages = messagesByRequest.get(request.id) ?? []
            const route = routes.find((candidate) => candidate.bucket === request.bucket)
            const preview = latestPreview(request, messages)
            const latestMessage = messages.at(-1)
            const latestFrom = latestMessage?.sender_email || request.requester_email

            return (
              <details
                key={request.id}
                className={`${index > 0 ? 'border-t border-slate-200' : ''} group`}
              >
                <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] gap-3 px-4 py-4 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_auto] sm:items-center sm:px-5">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${request.status === 'open' ? 'bg-blue-500' : request.status === 'in_progress' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                      <p className="truncate text-sm font-black text-slate-950">{request.requester_name || latestFrom}</p>
                    </div>
                    <p className="mt-1 truncate pl-[18px] text-xs text-slate-500">{request.requester_email}</p>
                  </div>

                  <div className="col-span-2 min-w-0 sm:col-span-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold text-slate-900">{request.topic}</p>
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-black text-violet-700">{route?.label ?? request.bucket}</span>
                      {completed ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">Published</span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                      <span className="font-semibold text-slate-600">{latestFrom}</span>
                      {preview ? ` — ${preview}` : ''}
                    </p>
                  </div>

                  <div className="row-start-1 flex items-center gap-2 text-right sm:row-auto">
                    <span className="whitespace-nowrap text-xs font-bold text-slate-500">{formatInboxDate(request.updated_at)}</span>
                    <span className="text-lg text-slate-400 transition group-open:rotate-90">›</span>
                  </div>
                </summary>

                <div className="border-t border-slate-200 bg-slate-50/40 px-4 py-5 sm:px-5 sm:py-6">
                  <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-xl font-black text-slate-950">{request.topic}</h2>
                      <p className="mt-1 text-sm font-bold text-slate-800">From: {request.requester_name} &lt;{request.requester_email}&gt;</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>Opened {formatDate(request.created_at)}</span>
                        <span>Updated {formatDate(request.updated_at)}</span>
                        <span>{channelLabel(request)}</span>
                        {request.inbound_to ? <span>To: {request.inbound_to}</span> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">{route?.label ?? request.bucket}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${completed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {completed ? 'Published' : statusLabel(request.status)}
                      </span>
                    </div>
                  </div>

                  <ConversationThread request={request} messages={messages} />

                  {request.internal_notes ? (
                    <aside className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Private internal notes</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{request.internal_notes}</p>
                    </aside>
                  ) : null}

                  <div className="mt-5 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Reply & workflow</p>
                    <SupportRequestForm request={request} routes={routes} />
                  </div>
                </div>
              </details>
            )
          })}
        </section>
      </div>
    </main>
  )
}
