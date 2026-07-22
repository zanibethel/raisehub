import Link from 'next/link'

// =============================================================================
// Types
// =============================================================================

type CustomerDigitalPassProps = {
  hasActivePass: boolean
  entitlementType?: string | null
  startsAt?: string | null
  expiresAt?: string | null
  supportedOrganizationName?:
    string | null
}

// =============================================================================
// Display helpers
// =============================================================================

function formatEntitlementType(
  value: string | null | undefined
): string {
  if (!value?.trim()) {
    return 'RaiseHub Pass'
  }

  return value
    .split('_')
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(' ')
}

function formatPassDate(
  value: string | null | undefined
): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  )
}

function getDaysRemaining(
  expiresAt: string | null | undefined
): number | null {
  if (!expiresAt) {
    return null
  }

  const expirationDate =
    new Date(expiresAt)

  if (
    Number.isNaN(
      expirationDate.getTime()
    )
  ) {
    return null
  }

  const remainingMilliseconds =
    expirationDate.getTime() -
    Date.now()

  return Math.max(
    Math.ceil(
      remainingMilliseconds /
        (1000 * 60 * 60 * 24)
    ),
    0
  )
}

// =============================================================================
// Active pass
// =============================================================================

function ActivePass({
  entitlementType,
  startsAt,
  expiresAt,
  supportedOrganizationName,
}: {
  entitlementType?: string | null
  startsAt?: string | null
  expiresAt?: string | null
  supportedOrganizationName?:
    string | null
}) {
  const formattedStartDate =
    formatPassDate(startsAt)

  const formattedExpirationDate =
    formatPassDate(expiresAt)

  const daysRemaining =
    getDaysRemaining(expiresAt)

  return (
    <section
      aria-labelledby="customer-digital-pass-title"
      className="overflow-hidden rounded-3xl border border-green-200 bg-gradient-to-br from-green-700 via-green-600 to-blue-700 text-white shadow-xl"
    >
      <div className="relative p-5 sm:p-8">
        <div
          aria-hidden="true"
          className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10"
        />

        <div
          aria-hidden="true"
          className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-white/10"
        />

        <div className="relative min-w-0">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-100">
                Active RaiseHub Pass
              </p>

              <h2
                id="customer-digital-pass-title"
                className="mt-2 break-words text-2xl font-bold leading-tight sm:text-3xl"
              >
                Local deals are unlocked
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-green-50">
                Use your dashboard to find
                participating offers, track
                your verified savings, and
                keep an eye on your pass
                expiration.
              </p>
            </div>

            <span className="w-fit shrink-0 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-xs font-semibold backdrop-blur">
              Verified access
            </span>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-100">
                Pass type
              </p>

              <p className="mt-2 break-words font-bold">
                {formatEntitlementType(
                  entitlementType
                )}
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-100">
                Started
              </p>

              <p className="mt-2 break-words font-bold">
                {formattedStartDate ??
                  'Start date unavailable'}
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-100">
                Expires
              </p>

              <p className="mt-2 break-words font-bold">
                {formattedExpirationDate ??
                  'No expiration date'}
              </p>

              {daysRemaining !== null ? (
                <p className="mt-1 text-xs text-green-100">
                  {daysRemaining === 0
                    ? 'Expires today'
                    : `${daysRemaining} ${
                        daysRemaining === 1
                          ? 'day'
                          : 'days'
                      } remaining`}
                </p>
              ) : null}
            </div>

            {supportedOrganizationName?.trim() ? (
              <div className="min-w-0 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-100">
                  Supporting
                </p>

                <p className="mt-2 break-words font-bold">
                  {
                    supportedOrganizationName
                  }
                </p>
              </div>
            ) : null}
          </div>

          <nav
            aria-label="Customer pass shortcuts"
            className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            <Link
              href="/dashboard#available-offers"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-white px-5 py-3 text-center text-sm font-semibold text-green-700 transition hover:bg-green-50"
            >
              Browse Available Deals
            </Link>

            <Link
              href="/dashboard#customer-savings"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-white/40 bg-white/15 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/25"
            >
              View My Savings
            </Link>

            <Link
              href="/campaigns"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/20 sm:col-span-2 lg:col-span-1"
            >
              Support Another Fundraiser
            </Link>
          </nav>
        </div>
      </div>
    </section>
  )
}

// =============================================================================
// Inactive pass
// =============================================================================

function InactivePass() {
  return (
    <section
      aria-labelledby="customer-digital-pass-title"
      className="overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-blue-50 p-5 shadow-xl sm:p-8"
    >
      <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            No Active RaiseHub Pass
          </p>

          <h2
            id="customer-digital-pass-title"
            className="mt-2 break-words text-2xl font-bold leading-tight text-gray-900"
          >
            Unlock local deals by
            supporting a fundraiser
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Purchase a pass through a
            participating campaign to
            support a local organization
            and gain access to community
            business offers.
          </p>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-white/80 p-4">
            <p className="break-words text-sm font-semibold text-gray-900">
              What happens next?
            </p>

            <p className="mt-1 text-sm leading-6 text-gray-600">
              Choose a fundraiser, complete
              your pass purchase, and your
              customer dashboard will
              automatically show your active
              access.
            </p>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto">
          <Link
            href="/campaigns"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-green-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-800 sm:w-auto"
          >
            Find a Fundraiser
          </Link>

          <Link
            href="/offers"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-blue-200 bg-white px-5 py-3 text-center text-sm font-semibold text-blue-700 transition hover:bg-blue-50 sm:w-auto"
          >
            Preview Local Deals
          </Link>
        </div>
      </div>
    </section>
  )
}

// =============================================================================
// Component
// =============================================================================

export default function CustomerDigitalPass({
  hasActivePass,
  entitlementType,
  startsAt,
  expiresAt,
  supportedOrganizationName,
}: CustomerDigitalPassProps) {
  if (!hasActivePass) {
    return <InactivePass />
  }

  return (
    <ActivePass
      entitlementType={
        entitlementType
      }
      startsAt={startsAt}
      expiresAt={expiresAt}
      supportedOrganizationName={
        supportedOrganizationName
      }
    />
  )
}