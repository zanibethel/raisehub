import 'server-only'

import { buildProductionUrl } from '@/lib/production-url'

type SendNotificationEmailInput = {
  to: string
  recipientName?: string | null
  title: string
  message: string
  actionUrl?: string | null
  actionLabel?: string | null
  idempotencyKey: string
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

function buildFromAddress(from: string) {
  if (from.includes('<') && from.includes('>')) return from
  return `RaiseHub Notifications <${from}>`
}

function renderEmail(input: SendNotificationEmailInput) {
  const safeTitle = escapeHtml(input.title)
  const safeMessage = escapeHtml(input.message).replaceAll('\n', '<br />')
  const safeName = input.recipientName?.trim()
    ? escapeHtml(input.recipientName.trim())
    : null
  const actionUrl = buildActionUrl(input.actionUrl)
  const actionLabel = input.actionLabel?.trim() || 'Open RaiseHub'

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
                ${
                  actionUrl
                    ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;padding:12px 18px;border-radius:10px;">${escapeHtml(actionLabel)}</a></p>`
                    : ''
                }
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
  const from = process.env.RESEND_FROM_EMAIL?.trim()

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
        from: buildFromAddress(from),
        to: [input.to],
        subject: input.title,
        html: renderEmail(input),
        reply_to: 'support@raisehub.app',
        tags: [
          { name: 'product', value: 'raisehub' },
          { name: 'category', value: 'notification' },
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
