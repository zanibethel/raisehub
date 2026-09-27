import 'server-only'

import { sendNotificationEmail } from '@/lib/notifications/email'

type AdEmailInput = {
  orderId: string
  businessName: string
  contactEmail: string
  planLabel: string
  amountCents: number
  durationDays: number
  recurring: boolean
  adText: string
  destinationUrl: string
}

function dollars(cents: number) {
  return '$' + (cents / 100).toFixed(2)
}

export async function sendWebPortalSupportThankYou(input: {
  email: string
  amountCents: number
  stripeEventId: string
}) {
  return sendNotificationEmail({
    to: input.email,
    title: 'Thank you for supporting WebPortal',
    message:
      `We received your ${dollars(input.amountCents)} support payment. Thank you for helping cover WebPortal hosting, testing, releases, and continued development.`,
    actionUrl: '/webportal/support',
    actionLabel: 'Open WebPortal Support',
    idempotencyKey: `webportal-support-thanks-${input.stripeEventId}`,
    fromName: 'WebPortal',
    replyTo: 'support@raisehub.app',
    category: 'webportal-support',
  })
}

export async function sendWebPortalAdPendingReview(
  input: AdEmailInput & { stripeEventId: string }
) {
  return sendNotificationEmail({
    to: input.contactEmail,
    title: 'Your WebPortal ad payment was received',
    message:
      `We received your ${dollars(input.amountCents)} payment for ${input.planLabel} of WebPortal advertising for ${input.businessName}.\n\nYour ad is now pending review. Your paid placement time does not start until the ad is approved and activated.\n\nAd message: “${input.adText}”\nQR destination: ${input.destinationUrl}${input.recurring ? '\n\nThis is a recurring monthly placement and will renew until canceled.' : ''}`,
    actionUrl: '/webportal/advertise',
    actionLabel: 'View WebPortal Advertising',
    idempotencyKey: `webportal-ad-pending-${input.stripeEventId}`,
    fromName: 'WebPortal',
    replyTo: 'support@raisehub.app',
    category: 'webportal-advertising',
  })
}

export async function sendWebPortalAdInternalAlert(
  input: AdEmailInput & { stripeEventId: string }
) {
  const to =
    process.env.WEBPORTAL_ADMIN_EMAIL?.trim() ||
    process.env.SUPPORT_EMAIL?.trim() ||
    'support@raisehub.app'

  return sendNotificationEmail({
    to,
    title: `New paid WebPortal ad: ${input.businessName}`,
    message:
      `A paid WebPortal ad is waiting for review.\n\nOrder: ${input.orderId}\nPlan: ${input.planLabel} · ${dollars(input.amountCents)}${input.recurring ? ' recurring' : ''}\nBusiness: ${input.businessName}\nContact: ${input.contactEmail}\nAd: “${input.adText}”\nDestination: ${input.destinationUrl}\n\nThe paid placement clock should begin only after approval and activation.`,
    idempotencyKey: `webportal-ad-admin-${input.stripeEventId}`,
    fromName: 'WebPortal',
    replyTo: input.contactEmail,
    category: 'webportal-ad-review',
  })
}

export async function sendWebPortalAdCanceled(input: {
  orderId: string
  businessName: string
  contactEmail: string
  stripeEventId: string
}) {
  return sendNotificationEmail({
    to: input.contactEmail,
    title: 'Your recurring WebPortal ad was canceled',
    message:
      `The recurring WebPortal advertising subscription for ${input.businessName} has been canceled. You will not be billed for another monthly renewal. Any already-paid active placement remains subject to its current paid period.`,
    actionUrl: '/webportal/advertise',
    actionLabel: 'WebPortal Advertising',
    idempotencyKey: `webportal-ad-canceled-${input.stripeEventId}`,
    fromName: 'WebPortal',
    replyTo: 'support@raisehub.app',
    category: 'webportal-advertising',
  })
}

export async function sendWebPortalAdApproved(input: {
  orderId: string
  businessName: string
  contactEmail: string
  startsAt: string
  endsAt: string
  idempotencyKey: string
}) {
  return sendNotificationEmail({
    to: input.contactEmail,
    title: 'Your WebPortal ad is live',
    message:
      `Your WebPortal ad for ${input.businessName} has been approved and activated.\n\nStarts: ${input.startsAt}\nEnds: ${input.endsAt}`,
    idempotencyKey: input.idempotencyKey,
    fromName: 'WebPortal',
    replyTo: 'support@raisehub.app',
    category: 'webportal-advertising',
  })
}

export async function sendWebPortalAdRejected(input: {
  orderId: string
  businessName: string
  contactEmail: string
  reason?: string | null
  paymentResolution?: string | null
  idempotencyKey: string
}) {
  return sendNotificationEmail({
    to: input.contactEmail,
    title: 'Update on your WebPortal ad submission',
    message:
      `Your WebPortal ad for ${input.businessName} was not approved in its current form.${input.reason ? `\n\nReason: ${input.reason}` : ''}${input.paymentResolution ? `\n\nPayment update: ${input.paymentResolution}` : ''}\n\nReply to this email if you need help correcting the submission or resolving the payment.`,
    actionUrl: '/webportal/advertise',
    actionLabel: 'WebPortal Advertising',
    idempotencyKey: input.idempotencyKey,
    fromName: 'WebPortal',
    replyTo: 'support@raisehub.app',
    category: 'webportal-advertising',
  })
}

export async function sendWebPortalAdDeactivated(input: {
  orderId: string
  businessName: string
  contactEmail: string
  reason: string
  recurringCanceled: boolean
  idempotencyKey: string
}) {
  return sendNotificationEmail({
    to: input.contactEmail,
    title: 'Your WebPortal ad was deactivated',
    message:
      `Your WebPortal ad for ${input.businessName} has been removed from rotation.\n\nReason: ${input.reason}${input.recurringCanceled ? '\n\nRecurring billing was also canceled, so there will be no future monthly renewals.' : ''}`,
    actionUrl: '/webportal/advertise',
    actionLabel: 'WebPortal Advertising',
    idempotencyKey: input.idempotencyKey,
    fromName: 'WebPortal',
    replyTo: 'support@raisehub.app',
    category: 'webportal-advertising',
  })
}

export type { AdEmailInput }
