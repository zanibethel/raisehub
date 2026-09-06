'use client'

import { useMemo, useState } from 'react'

type Recipient = {
  id: string
  name: string
  email: string | null
  role: 'business' | 'organization' | 'customer'
  isDemo: boolean
}

type TemplateKey =
  | 'custom'
  | 'complete_profile'
  | 'refresh_offers'
  | 'review_reports'
  | 'campaign_ready'

type Props = {
  recipients: Recipient[]
}

const templates: Record<TemplateKey, { title: string; message: string; actionUrl: string; actionLabel: string }> = {
  custom: {
    title: '',
    message: '',
    actionUrl: '/dashboard',
    actionLabel: 'Open RaiseHub',
  },
  complete_profile: {
    title: 'Please finish your RaiseHub profile',
    message: 'A few profile details still need your attention. Please review your workspace so supporters have the information they need.',
    actionUrl: '/dashboard',
    actionLabel: 'Review profile',
  },
  refresh_offers: {
    title: 'Please review your RaiseHub offers',
    message: 'Please make sure your active offers are current and useful for supporters. Update, replace, or add an offer if anything has changed.',
    actionUrl: '/dashboard/offers',
    actionLabel: 'Review offers',
  },
  review_reports: {
    title: 'Your RaiseHub activity report is ready to review',
    message: 'Please review your recent RaiseHub activity and redemption reporting. This can help you confirm current supporter engagement and spot anything that needs attention.',
    actionUrl: '/dashboard/reports',
    actionLabel: 'View reports',
  },
  campaign_ready: {
    title: 'Please make sure your RaiseHub workspace is campaign-ready',
    message: 'Fundraising activity is approaching. Please review your profile and offers so supporters see accurate, current information when they arrive.',
    actionUrl: '/dashboard',
    actionLabel: 'Review workspace',
  },
}

const roleLabels = {
  business: 'Businesses',
  organization: 'Organizations',
  customer: 'Customers',
}

export default function OwnerNotificationTool({ recipients }: Props) {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<'all' | Recipient['role']>('all')
  const [includeDemo, setIncludeDemo] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [template, setTemplate] = useState<TemplateKey>('custom')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [actionUrl, setActionUrl] = useState('/dashboard')
  const [actionLabel, setActionLabel] = useState('Open RaiseHub')
  const [sendEmail, setSendEmail] = useState(true)
  const [severity, setSeverity] = useState<'info' | 'success' | 'warning' | 'error'>('info')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const filteredRecipients = useMemo(() => {
    const query = search.trim().toLowerCase()
    return recipients.filter((recipient) => {
      if (role !== 'all' && recipient.role !== role) return false
      if (!includeDemo && recipient.isDemo) return false
      if (!query) return true
      return `${recipient.name} ${recipient.email ?? ''}`.toLowerCase().includes(query)
    })
  }, [includeDemo, recipients, role, search])

  function applyTemplate(nextTemplate: TemplateKey) {
    setTemplate(nextTemplate)
    const next = templates[nextTemplate]
    setTitle(next.title)
    setMessage(next.message)
    setActionUrl(next.actionUrl)
    setActionLabel(next.actionLabel)
  }

  function toggleRecipient(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    )
  }

  function selectVisible() {
    const visibleIds = filteredRecipients.map((recipient) => recipient.id)
    setSelectedIds((current) => [...new Set([...current, ...visibleIds])])
  }

  async function sendNotification() {
    if (selectedIds.length === 0 || !title.trim() || !message.trim()) return
    setSending(true)
    setResult(null)

    try {
      const response = await fetch('/api/owner/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientIds: selectedIds,
          title: title.trim(),
          message: message.trim(),
          actionUrl: actionUrl.trim() || null,
          actionLabel: actionLabel.trim() || null,
          severity,
          sendEmail,
          template,
        }),
      })

      const payload = (await response.json()) as {
        error?: string
        notificationsCreated?: number
        emailsSent?: number
        emailsSkipped?: number
        emailsFailed?: number
      }

      if (!response.ok) {
        setResult(payload.error || 'Unable to send notification.')
        return
      }

      setResult(
        `Sent ${payload.notificationsCreated ?? 0} in-app notification${payload.notificationsCreated === 1 ? '' : 's'}${
          sendEmail
            ? ` and ${payload.emailsSent ?? 0} email${payload.emailsSent === 1 ? '' : 's'}.`
            : '.'
        }${payload.emailsFailed ? ` ${payload.emailsFailed} email delivery failed.` : ''}`
      )
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Unable to send notification.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Recipients</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Choose profiles</h2>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">
            {selectedIds.length} selected
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or email"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none ring-blue-200 placeholder:text-slate-400 focus:ring-4"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as typeof role)}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800"
          >
            <option value="all">All roles</option>
            <option value="business">Businesses</option>
            <option value="organization">Organizations</option>
            <option value="customer">Customers</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <label className="inline-flex items-center gap-2 font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={includeDemo}
              onChange={(event) => setIncludeDemo(event.target.checked)}
            />
            Include demo profiles
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={selectVisible} className="font-bold text-blue-700 hover:text-blue-900">
              Select visible
            </button>
            <button type="button" onClick={() => setSelectedIds([])} className="font-bold text-slate-500 hover:text-slate-800">
              Clear
            </button>
          </div>
        </div>

        <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
          {filteredRecipients.map((recipient) => (
            <label
              key={recipient.id}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-blue-300 hover:bg-blue-50"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(recipient.id)}
                onChange={() => toggleRecipient(recipient.id)}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-black text-slate-950">{recipient.name}</p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-600">
                    {roleLabels[recipient.role]}
                  </span>
                  {recipient.isDemo ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">Demo</span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-sm text-slate-600">{recipient.email || 'No email on file'}</p>
              </div>
            </label>
          ))}
          {filteredRecipients.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No matching profiles.</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Message</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">Compose notification</h2>

        <label className="mt-5 block text-sm font-bold text-slate-700">
          Reminder template
          <select
            value={template}
            onChange={(event) => applyTemplate(event.target.value as TemplateKey)}
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
          >
            <option value="custom">Custom message</option>
            <option value="complete_profile">Complete profile</option>
            <option value="refresh_offers">Review / refresh offers</option>
            <option value="review_reports">Review redemption reports</option>
            <option value="campaign_ready">Campaign readiness</option>
          </select>
        </label>

        <label className="mt-4 block text-sm font-bold text-slate-700">
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={140}
            className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none ring-blue-200 focus:ring-4"
          />
        </label>

        <label className="mt-4 block text-sm font-bold text-slate-700">
          Message
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={7}
            maxLength={1500}
            className="mt-2 w-full resize-y rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-950 outline-none ring-blue-200 focus:ring-4"
          />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700">
            Action label
            <input
              value={actionLabel}
              onChange={(event) => setActionLabel(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950"
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Action path
            <input
              value={actionUrl}
              onChange={(event) => setActionUrl(event.target.value)}
              placeholder="/dashboard"
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700">
            Priority
            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value as typeof severity)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
            >
              <option value="info">Information</option>
              <option value="success">Positive update</option>
              <option value="warning">Reminder / action needed</option>
              <option value="error">Urgent action</option>
            </select>
          </label>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-900">Delivery</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Every send creates an in-app notification.</p>
            <label className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} />
              Also send email
            </label>
          </div>
        </div>

        {result ? (
          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-950">{result}</div>
        ) : null}

        <button
          type="button"
          onClick={sendNotification}
          disabled={sending || selectedIds.length === 0 || !title.trim() || !message.trim()}
          className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? 'Sending…' : `Send to ${selectedIds.length || 0} selected profile${selectedIds.length === 1 ? '' : 's'}`}
        </button>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          Owner sends are deliberate manual communications. Demo profiles are excluded unless you explicitly include them.
        </p>
      </section>
    </div>
  )
}
