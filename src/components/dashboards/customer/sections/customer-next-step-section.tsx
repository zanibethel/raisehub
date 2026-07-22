import Link from 'next/link'

// =============================================================================
// Types
// =============================================================================

type Props = {
  hasActivePass: boolean
  availableOfferCount: number
  savedDealCount: number
  readyToUseDealCount: number
  purchaseCount: number
}

type CustomerNextStep = {
  eyebrow: string
  title: string
  description: string
  actionLabel: string
  actionHref: string
  secondaryLabel?: string
  secondaryHref?: string
}

// =============================================================================
// Guidance
// =============================================================================

export function getCustomerNextStep({
  hasActivePass,
  availableOfferCount,
  savedDealCount,
  readyToUseDealCount,
  purchaseCount,
}: Props): CustomerNextStep {
  if (!hasActivePass) {
    return {
      eyebrow: purchaseCount > 0
        ? 'Pass Access Needed'
        : 'Start Here',
      title: purchaseCount > 0
        ? 'Choose your next fundraiser'
        : 'Activate your RaiseHub Pass',
      description:
        'Support a participating fundraiser to unlock local offers and start building your digital pass.',
      actionLabel: 'Choose a Fundraiser',
      actionHref: '/campaigns',
      secondaryLabel: 'See How It Works',
      secondaryHref:
        '/how-it-works/supporters',
    }
  }

  if (readyToUseDealCount > 0) {
    return {
      eyebrow: 'Ready When You Are',
      title:
        readyToUseDealCount === 1
          ? 'Use your saved deal'
          : `Use one of your ${readyToUseDealCount} saved deals`,
      description:
        'Your pass is active and these deals are ready to redeem. Open My Pass before visiting the business.',
      actionLabel: 'Open My Pass',
      actionHref: '#my-pass',
      secondaryLabel: 'View Redemption History',
      secondaryHref: '#redemption-history',
    }
  }

  if (availableOfferCount > 0) {
    return {
      eyebrow:
        savedDealCount > 0
          ? 'Find Another Favorite'
          : 'Pass Ready',
      title: 'Save a deal for later',
      description:
        'Browse participating offers and add the ones you plan to use to My Pass for quick access.',
      actionLabel: 'Browse Available Deals',
      actionHref: '#available-offers',
      secondaryLabel: 'Explore Nearby Businesses',
      secondaryHref: '#nearby-businesses',
    }
  }

  return {
    eyebrow: 'Pass Ready',
    title: 'Your pass is active',
    description:
      'There are no participating offers available right now. Your pass remains active, so check again as businesses add new deals.',
    actionLabel: 'Check Customer Updates',
    actionHref: '#customer-updates',
    secondaryLabel: 'Review Purchase History',
    secondaryHref: '#support-history',
  }
}

// =============================================================================
// Component
// =============================================================================

export default function CustomerNextStepSection(
  props: Props
) {
  const guidance = getCustomerNextStep(props)

  return (
    <section
      aria-labelledby="customer-next-step-heading"
      className="overflow-hidden rounded-3xl border border-yellow-200 bg-gradient-to-br from-yellow-50 via-white to-green-50 p-5 shadow-xl sm:p-7"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">
            {guidance.eyebrow}
          </p>

          <h2
            id="customer-next-step-heading"
            className="mt-2 break-words text-2xl font-bold leading-tight text-gray-900"
          >
            {guidance.title}
          </h2>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            {guidance.description}
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row lg:flex-col">
          <Link
            href={guidance.actionHref}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-green-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-800 sm:w-auto"
          >
            {guidance.actionLabel}
          </Link>

          {guidance.secondaryLabel &&
          guidance.secondaryHref ? (
            <Link
              href={guidance.secondaryHref}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-green-200 bg-white px-5 py-3 text-center text-sm font-semibold text-green-700 transition hover:bg-green-50 sm:w-auto"
            >
              {guidance.secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  )
}
