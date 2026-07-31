import { createClient } from '@/lib/supabase/server'

type SupportRequest = {
  id: string
  topic: string
  message: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  customer_reply: string | null
  customer_reply_sent_at: string | null
  created_at: string
  updated_at: string
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Unknown date'
    : date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
}

function statusLabel(status: SupportRequest['status']) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default async function CustomerSupportHistory() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('support_requests')
    .select('id, topic, message, status, customer_reply, customer_reply_sent_at, created_at, updated_at')
    .eq('requester_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Unable to load customer support history:', error)
    return null
  }

  const requests = (data ?? []) as SupportRequest[]
  if (requests.length === 0) return null

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        Your support requests
      </p>
      <h2 className="mt-2 text-2xl font-black text-slate-950">
        Track messages and replies
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        Signed-in requests appear here. RaiseHub replies are shown only after Support publishes them.
      </p>

      <div className="mt-5 space-y-3">
        {requests.map((request) => (
          <details key={request.id} className="group rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                    {request.topic}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                    {statusLabel(request.status)}
                  </span>
                  {request.customer_reply_sent_at ? (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      Replied
                    </span>
                  ) : null}
                </span>
                <span className="mt-2 block text-sm font-bold text-slate-950">
                  Sent {formatDate(request.created_at)}
                </span>
              </span>
              <span aria-hidden="true" className="shrink-0 text-xl text-blue-600 transition group-open:rotate-45">
                +
              </span>
            </summary>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Your message</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{request.message}</p>

              {request.customer_reply_sent_at && request.customer_reply ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                    RaiseHub Support · {formatDate(request.customer_reply_sent_at)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-emerald-950">
                    {request.customer_reply}
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                  Support has received this request. A published reply will appear here.
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
