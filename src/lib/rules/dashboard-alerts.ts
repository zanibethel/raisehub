/**
 * RaiseHub Dashboard Alert Engine
 *
 * Rules-based dashboard recommendations.
 * No AI required.
 */

export type DashboardAlertType =
  | 'success'
  | 'info'
  | 'warning'
  | 'danger'

export type DashboardAlert = {
  id: string
  type: DashboardAlertType
  title: string
  description: string
  action?: string
}

type DashboardAlertInput = {
  activeOffers: number
  pausedOffers: number
  expiringSoon: number
  reviewRecommended: number
  profileComplete: boolean
}

export function getDashboardAlerts(
  input: DashboardAlertInput
): DashboardAlert[] {
  const alerts: DashboardAlert[] = []

  if (input.activeOffers < 3) {
    alerts.push({
      id: 'offer-slots',
      type: 'info',
      title: 'You have room for more offers',
      description:
        'Businesses with multiple exclusive offers generally see better engagement.',
      action: 'Create Offer',
    })
  }

  if (input.pausedOffers > 0) {
    alerts.push({
      id: 'paused',
      type: 'warning',
      title: `${input.pausedOffers} offer(s) are paused`,
      description:
        'Paused offers are hidden from members until resumed.',
      action: 'Resume Offers',
    })
  }

  if (input.expiringSoon > 0) {
    alerts.push({
      id: 'expiring',
      type: 'warning',
      title: `${input.expiringSoon} offer(s) expire soon`,
      description:
        'Consider extending long-term offers instead of creating new ones.',
      action: 'Review Offers',
    })
  }

  if (input.reviewRecommended > 0) {
    alerts.push({
      id: 'review',
      type: 'info',
      title: `${input.reviewRecommended} offer(s) are ready for review`,
      description:
        'Performance has changed enough to recommend reviewing these offers.',
      action: 'Review',
    })
  }

  if (!input.profileComplete) {
    alerts.push({
      id: 'profile',
      type: 'danger',
      title: 'Complete your business profile',
      description:
        'A complete profile helps customers trust your business.',
      action: 'Finish Profile',
    })
  }

  return alerts
}