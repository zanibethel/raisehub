import 'server-only'

import { buildProductionUrl } from '@/lib/production-url'

type NotificationEmailAction = {
  label: string
  url: string
  tone?: 'primary' | 'success' | 'danger' | 'neutral'
}

type SendNotificationEmailInput = {
  to: string
  recipientName?: string | null
  title: string
  message: string
  actionUrl?: string | null
  actionLabel?: string | null
  actions?: NotificationEmailAction[] | null
  idempotencyKey: string
  fromEmail?: string | null
  fromName?: string | null
  replyTo?: string | null
  category?: string | null
}

type SendNotificationEmailResult =
  | { status: 'sent'; providerMessageId: string | null }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string }

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function buildActionUrl(actionUrl?: string | null) {
  if (!actionUrl) return null
  if (/^https?:\/\//i.test(actionUrl)) return actionUrl
  return buildProductionUrl(actionUrl)
}

function buildFromAddress(from: string, fromName?: string | null) {
  if (from.includes('<') && from.includes('>')) return from
  const name = fromName?.trim() || 'RaiseHub Notifications'
  return `${name} <${from}>`
}

function renderActionButtons(input: SendNotificationEmailInput) {
  const toneStyles = {
    primary: 'background:#0f766e;color:#ffffff;border:1px solid #0f766e;',
    success: 'background:#15803d;color:#ffffff;border:1px solid #15803d;',
    danger: 'background:#ffffff;color:#b91c1c;border:1px solid #fecaca;',
    neutral: 'background:#ffffff;color:#334155;border:1px solid #cbd5e1;',
  } as const

  const actions = (input.actions ?? [])
    .filter((action) => action.label.trim() && action.url.trim())
    .slice(0, 4)
    .map((action) => ({
      label: action.label.trim(),
      url: buildActionUrl(action.url),
      tone: action.tone ?? 'primary',
    }))
    .filter((action) => Boolean(action.url))

  if (actions.length) {
    return `<div style="margin:24px 0 0;">${actions
      .map((action) => {
        const tone = action.tone as keyof typeof toneStyles
        return `<a href="${escapeHtml(action.url as string)}" style="display:inline-block;margin:0 8px 8px 0;text-decoration:none;font-size:15px;font-weight:800;padding:12px 18px;border-radius:10px;${toneStyles[tone]}">${escapeHtml(action.label)}</a>`
      })
      .join('')}</div>`
  }

  const actionUrl = buildActionUrl(input.actionUrl)
  if (!actionUrl) return ''
  const actionLabel = input.actionLabel?.trim() || 'Open RaiseHub'

  return `<p style="margin:24px 0 0;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;padding:12px 18px;border-radius:10px;">${escapeHtml(actionLabel)}</a></p>`
}

function renderEmail(input: SendNotificationEmailInput) {
  const safeTitle = escapeHtml(input.title)
  const safeMessage = escapeHtml(input.message).replaceAll('\n', '<br />')
  const safeName = input.recipientName?.trim()
    ? escapeHtml(input.recipientName.trim())
    : null
  const actionButtons = renderActionButtons(input)

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:22px 26px;background:#0f766e;color:#ffffff;">
                <div style="font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;opacity:.88;">RaiseHub</div>
                <div style="margin-top:7px;font-size:24px;font-weight:800;line-height:1.2;">${safeTitle}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px;">
                ${safeName ? `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;">Hi ${safeName},</p>` : ''}
                <p style="margin:0;font-size:16px;line-height:1.65;color:#334155;">${safeMessage}</p>
                ${actionButtons}
                <p style="margin:28px 0 0;font-size:13px;line-height:1.55;color:#64748b;">Important RaiseHub updates also remain available in your notification center when an in-app notice is included.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export async function sendNotificationEmail(
  input: SendNotificationEmailInput
): Promise<SendNotificationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = input.fromEmail?.trim() || process.env.RESEND_FROM_EMAIL?.trim()

  if (!apiKey || !from) {
    return {
      status: 'skipped',
      reason: 'Transactional email is not configured.',
    }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': input.idempotencyKey,
      },
      body: JSON.stringify({
        from: buildFromAddress(from, input.fromName),
        to: [input.to],
        subject: input.title,
        html: renderEmail(input),
        reply_to: input.replyTo?.trim() || 'support@raisehub.app',
        tags: [
          { name: 'product', value: 'raisehub' },
          { name: 'category', value: input.category?.trim() || 'notification' },
        ],
      }),
      cache: 'no-store',
    })

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string; error?: { message?: string } }
      | null

    if (!response.ok) {
      return {
        status: 'failed',
        error:
          payload?.error?.message ||
          payload?.message ||
          `Email provider returned HTTP ${response.status}.`,
      }
    }

    return {
      status: 'sent',
      providerMessageId: payload?.id ?? null,
    }
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown email delivery error.',
    }
  }
}
