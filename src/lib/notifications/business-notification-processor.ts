import 'server-only'

import { getOfferStatus } from '@/lib/rules/offer-status'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNotificationEmail } from './email'

type PreferenceCategory =
  | 'business_updates'
  | 'offer_expiry'
  | 'redemption_digest'
  | 'weekly_digest'

type NotificationDefinition = {
  userId: string
  sourceKey: string
  type: string
  severity: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  actionUrl?: string | null
  actionLabel?: string | null
  expiresAt?: string | null
  preferenceCategory: PreferenceCategory
  emailRecommended: boolean
  metadata?: Record<string, unknown>
}

type BusinessMembershipRow = {
  business_id: string
  user_id: string
  membership_role: string
}

type BusinessRow = {
  id: string
  legacy_profile_id: string | null
  name: string
  phone: string | null
  email: string | null
  address: string | null
  logo_url: string | null
  subscription_tier: string
  status: string
}

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  redemption_method: string | null
}

type OfferRow = {
  id: string
  business_id: string
  title: string
  starts_at: string | null
  ends_at: string | null
  is_active: boolean | null
}

type RedemptionRow = {
  id: string
  offer_id: string | null
  status: string
  created_at: string | null
}

type ProcessorSummary = {
  businessesEvaluated: number
  notificationsCreated: number
  duplicateNotificationsSkipped: number
  emailsSent: number
  emailsSkipped: number
  emailsFailed: number
  errors: string[]
}

const FREE_ACTIVE_OFFER_LIMIT = 3
const EMAIL_ROLES = new Set(['owner', 'manager'])

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

function addUtcDays(value: Date, days: number) {
  const copy = new Date(value)
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

function getExpiryThreshold(days: number | null) {
  if (days === null || days < 0 || days > 14) return null
  if (days <= 1) return 1
  if (days <= 3) return 3
  if (days <= 7) return 7
  return 14
}

function getWeekStart(now: Date) {
  const day = now.getUTCDay()
  const daysSinceMonday = (day + 6) % 7
  return addUtcDays(startOfUtcDay(now), -daysSinceMonday)
}

function buildMissingSetupFields(business: BusinessRow, profile: ProfileRow | null) {
  const fields: string[] = []
  if (!business.phone?.trim()) fields.push('phone number')
  if (!business.address?.trim()) fields.push('business location')
  if (!business.logo_url?.trim()) fields.push('logo')
  if (!profile?.redemption_method?.trim()) fields.push('redemption method')
  return fields
}

async function createAndDeliverNotification(
  admin: any,
  definition: NotificationDefinition,
  recipient: ProfileRow | null,
  summary: ProcessorSummary
) {
  const now = new Date().toISOString()

  const { data: notification, error: notificationError } = await admin
    .from('notifications')
    .insert({
      user_id: definition.userId,
      source_key: definition.sourceKey,
      type: definition.type,
      severity: definition.severity,
      title: definition.title,
      message: definition.message,
      action_url: definition.actionUrl ?? null,
      action_label: definition.actionLabel ?? null,
      expires_at: definition.expiresAt ?? null,
      metadata: definition.metadata ?? {},
    })
    .select('id')
    .single()

  if (notificationError) {
    if (notificationError.code === '23505') {
      summary.duplicateNotificationsSkipped += 1
      return
    }

    summary.errors.push(
      `Notification ${definition.sourceKey}: ${notificationError.message}`
    )
    return
  }

  summary.notificationsCreated += 1

  if (!definition.emailRecommended || !recipient?.email?.trim()) {
    summary.emailsSkipped += 1
    return
  }

  const { data: preference } = await admin
    .from('notification_preferences')
    .select(
      'email_enabled, business_updates, offer_expiry, redemption_digest, weekly_digest'
    )
    .eq('user_id', definition.userId)
    .maybeSingle()

  const emailEnabled = preference?.email_enabled !== false
  const categoryEnabled = preference?.[definition.preferenceCategory] !== false

  const { data: delivery, error: deliveryError } = await admin
    .from('notification_deliveries')
    .insert({
      notification_id: notification.id,
      user_id: definition.userId,
      channel: 'email',
      status: emailEnabled && categoryEnabled ? 'pending' : 'skipped',
      provider: 'resend',
      attempted_at: emailEnabled && categoryEnabled ? now : null,
      error_message:
        emailEnabled && categoryEnabled ? null : 'Disabled by notification preferences.',
    })
    .select('id')
    .single()

  if (deliveryError) {
    summary.errors.push(
      `Delivery ledger ${definition.sourceKey}: ${deliveryError.message}`
    )
    return
  }

  if (!emailEnabled || !categoryEnabled) {
    summary.emailsSkipped += 1
    return
  }

  const result = await sendNotificationEmail({
    to: recipient.email.trim(),
    recipientName: recipient.full_name,
    title: definition.title,
    message: definition.message,
    actionUrl: definition.actionUrl,
    actionLabel: definition.actionLabel,
    idempotencyKey: `raisehub/${notification.id}/email`,
  })

  if (result.status === 'sent') {
    summary.emailsSent += 1
    await admin
      .from('notification_deliveries')
      .update({
        status: 'sent',
        provider_message_id: result.providerMessageId,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', delivery.id)
    return
  }

  if (result.status === 'skipped') {
    summary.emailsSkipped += 1
    await admin
      .from('notification_deliveries')
      .update({
        status: 'skipped',
        updated_at: new Date().toISOString(),
        error_message: result.reason,
      })
      .eq('id', delivery.id)
    return
  }

  summary.emailsFailed += 1
  await admin
    .from('notification_deliveries')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
      error_message: result.error,
    })
    .eq('id', delivery.id)
}

export async function processBusinessNotifications(now = new Date()) {
  const admin = createAdminClient() as any
  const summary: ProcessorSummary = {
    businessesEvaluated: 0,
    notificationsCreated: 0,
    duplicateNotificationsSkipped: 0,
    emailsSent: 0,
    emailsSkipped: 0,
    emailsFailed: 0,
    errors: [],
  }

  const { data: memberships, error: membershipsError } = await admin
    .from('business_memberships')
    .select('business_id, user_id, membership_role')
    .eq('status', 'active')
    .in('membership_role', ['owner', 'manager'])

  if (membershipsError) {
    throw new Error(`Unable to load business memberships: ${membershipsError.message}`)
  }

  const membershipRows = (memberships ?? []) as BusinessMembershipRow[]
  const businessIds = [...new Set(membershipRows.map((row) => row.business_id))]
  const userIds = [...new Set(membershipRows.map((row) => row.user_id))]

  if (businessIds.length === 0 || userIds.length === 0) return summary

  const [{ data: businesses }, { data: profiles }] = await Promise.all([
    admin
      .from('businesses')
      .select(
        'id, legacy_profile_id, name, phone, email, address, logo_url, subscription_tier, status'
      )
      .in('id', businessIds),
    admin
      .from('profiles')
      .select('id, email, full_name, redemption_method')
      .in('id', userIds),
  ])

  const businessRows = (businesses ?? []) as BusinessRow[]
  const profilesById = new Map(
    ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
  )

  const legacyProfileIds = businessRows
    .map((business) => business.legacy_profile_id)
    .filter((value): value is string => Boolean(value))

  const { data: offers } =
    legacyProfileIds.length > 0
      ? await admin
          .from('offers')
          .select('id, business_id, title, starts_at, ends_at, is_active')
          .in('business_id', legacyProfileIds)
      : { data: [] }

  const offerRows = (offers ?? []) as OfferRow[]
  const offersByLegacyProfileId = new Map<string, OfferRow[]>()
  for (const offer of offerRows) {
    const current = offersByLegacyProfileId.get(offer.business_id) ?? []
    current.push(offer)
    offersByLegacyProfileId.set(offer.business_id, current)
  }

  const offerIds = offerRows.map((offer) => offer.id)
  const weekStart = getWeekStart(now)
  const { data: recentRedemptions } =
    offerIds.length > 0
      ? await admin
          .from('redemptions')
          .select('id, offer_id, status, created_at')
          .in('offer_id', offerIds)
          .eq('status', 'confirmed')
          .gte('created_at', weekStart.toISOString())
      : { data: [] }

  const redemptions = (recentRedemptions ?? []) as RedemptionRow[]
  const redemptionsByOfferId = new Map<string, number>()
  for (const redemption of redemptions) {
    if (!redemption.offer_id) continue
    redemptionsByOfferId.set(
      redemption.offer_id,
      (redemptionsByOfferId.get(redemption.offer_id) ?? 0) + 1
    )
  }

  for (const business of businessRows) {
    if (business.status !== 'active') continue
    summary.businessesEvaluated += 1

    const businessMemberships = membershipRows.filter(
      (membership) => membership.business_id === business.id
    )
    const businessOffers = business.legacy_profile_id
      ? offersByLegacyProfileId.get(business.legacy_profile_id) ?? []
      : []

    const offerStatuses = businessOffers.map((offer) => ({
      offer,
      status: getOfferStatus({
        startsAt: offer.starts_at,
        endsAt: offer.ends_at,
        isActive: offer.is_active,
        now,
      }),
    }))

    const activeOffers = offerStatuses.filter(
      ({ status }) => status.status === 'active' || status.status === 'expiring-soon'
    )

    for (const membership of businessMemberships) {
      if (!EMAIL_ROLES.has(membership.membership_role)) continue
      const recipient = profilesById.get(membership.user_id) ?? null
      const missingFields = buildMissingSetupFields(business, recipient)

      if (missingFields.length > 0) {
        await createAndDeliverNotification(
          admin,
          {
            userId: membership.user_id,
            sourceKey: `business_setup:${business.id}:${isoDate(getWeekStart(now))}`,
            type: 'business_setup',
            severity: 'warning',
            title: `${business.name} still needs a few details`,
            message: `Complete your ${missingFields.join(', ')} so supporters have the information they need when they find and redeem your offers.`,
            actionUrl: '/dashboard/offers#business-profile',
            actionLabel: 'Finish business setup',
            preferenceCategory: 'business_updates',
            emailRecommended: true,
            metadata: { business_id: business.id, missing_fields: missingFields },
          },
          recipient,
          summary
        )
      }

      if (activeOffers.length === 0) {
        await createAndDeliverNotification(
          admin,
          {
            userId: membership.user_id,
            sourceKey: `business_zero_live_offers:${business.id}:${isoDate(getWeekStart(now))}`,
            type: 'offer_health',
            severity: 'error',
            title: `${business.name} has no live offers`,
            message:
              'Supporters currently have no active RaiseHub offer to use at your business. Add or reactivate an offer so your business is ready when fundraising traffic arrives.',
            actionUrl: '/dashboard/offers#create-offer',
            actionLabel: 'Add an offer',
            preferenceCategory: 'business_updates',
            emailRecommended: true,
            metadata: { business_id: business.id, active_offer_count: 0 },
          },
          recipient,
          summary
        )
      } else if (
        business.subscription_tier !== 'growth' &&
        activeOffers.length < FREE_ACTIVE_OFFER_LIMIT
      ) {
        const availableSlots = FREE_ACTIVE_OFFER_LIMIT - activeOffers.length
        await createAndDeliverNotification(
          admin,
          {
            userId: membership.user_id,
            sourceKey: `business_free_offer_capacity:${business.id}:${isoDate(getWeekStart(now))}`,
            type: 'offer_capacity',
            severity: 'info',
            title: `You still have ${availableSlots} free offer ${availableSlots === 1 ? 'slot' : 'slots'} available`,
            message: `${business.name} is using ${activeOffers.length} of ${FREE_ACTIVE_OFFER_LIMIT} active offers included on the free plan. Add another useful offer whenever it gives supporters another reason to visit.`,
            actionUrl: '/dashboard/offers#create-offer',
            actionLabel: 'Create another offer',
            preferenceCategory: 'business_updates',
            emailRecommended: false,
            metadata: {
              business_id: business.id,
              active_offer_count: activeOffers.length,
              available_slots: availableSlots,
            },
          },
          recipient,
          summary
        )
      }

      for (const { offer, status } of offerStatuses) {
        if (status.status !== 'expiring-soon') continue
        const threshold = getExpiryThreshold(status.daysUntilExpiration)
        if (!threshold) continue

        await createAndDeliverNotification(
          admin,
          {
            userId: membership.user_id,
            sourceKey: `offer_expiry:${offer.id}:${threshold}d`,
            type: 'offer_expiring',
            severity: threshold <= 3 ? 'warning' : 'info',
            title: `“${offer.title}” expires soon`,
            message:
              status.daysUntilExpiration === 0
                ? `Your offer “${offer.title}” expires today. Extend or replace it to avoid a gap for RaiseHub supporters.`
                : `Your offer “${offer.title}” expires in ${status.daysUntilExpiration} day${status.daysUntilExpiration === 1 ? '' : 's'}. Review it now so supporters do not lose access unexpectedly.`,
            actionUrl: '/dashboard/offers',
            actionLabel: 'Review offers',
            preferenceCategory: 'offer_expiry',
            emailRecommended: true,
            metadata: {
              business_id: business.id,
              offer_id: offer.id,
              days_until_expiration: status.daysUntilExpiration,
              threshold_days: threshold,
            },
          },
          recipient,
          summary
        )
      }

      if (now.getUTCDay() === 1) {
        const weeklyRedemptions = businessOffers.reduce(
          (count, offer) => count + (redemptionsByOfferId.get(offer.id) ?? 0),
          0
        )

        if (weeklyRedemptions > 0) {
          await createAndDeliverNotification(
            admin,
            {
              userId: membership.user_id,
              sourceKey: `business_weekly_redemptions:${business.id}:${isoDate(weekStart)}`,
              type: 'redemption_digest',
              severity: 'success',
              title: `${business.name}: ${weeklyRedemptions} redemption${weeklyRedemptions === 1 ? '' : 's'} this week`,
              message: `Your RaiseHub offers recorded ${weeklyRedemptions} confirmed redemption${weeklyRedemptions === 1 ? '' : 's'} since Monday. Open Reports to review offer activity and customer value delivered.`,
              actionUrl: '/dashboard/reports',
              actionLabel: 'View business reports',
              preferenceCategory: 'redemption_digest',
              emailRecommended: true,
              metadata: {
                business_id: business.id,
                week_start: isoDate(weekStart),
                confirmed_redemptions: weeklyRedemptions,
              },
            },
            recipient,
            summary
          )
        }
      }
    }
  }

  return summary
}
