import type {
  OwnerCustomerActivityResult,
  ReadOnlyCustomerPurchase,
  ReadOnlyCustomerRedemption,
  ReadOnlyCustomerSavedOffer,
} from '@/lib/services/owner-customer-activity-service'

// =============================================================================
// Types
// =============================================================================

type ReadOnlyCustomerActivitySectionProps = {
  activityResult: OwnerCustomerActivityResult | null
}

// =============================================================================
// Formatting helpers
// =============================================================================

function formatTimestamp(value: string | null): string {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return '—'
  }

  return parsed.toLocaleString()
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

// =============================================================================
// Metadata row (shared sub-component)
// =============================================================================

function MetadataRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  )
}

// =============================================================================
// Purchased pass card
// =============================================================================

function PurchaseCard({
  purchase,
}: {
  purchase: ReadOnlyCustomerPurchase
}) {
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <h4 className="min-w-0 break-words text-base font-bold text-slate-950">
          {purchase.campaignName ?? 'Untitled campaign'}
        </h4>

        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
          {purchase.paymentStatus}
        </span>
      </div>

      {purchase.organizationName ? (
        <p className="mt-1 break-words text-sm text-slate-600">
          Supporting{' '}
          <span className="font-semibold">
            {purchase.organizationName}
          </span>
        </p>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <MetadataRow
          label="Amount paid"
          value={formatCurrency(purchase.amountPaid)}
        />

        <MetadataRow
          label="Donation"
          value={formatCurrency(purchase.donationAmount)}
        />
      </div>

      <div className="mt-2">
        <MetadataRow
          label="Purchased"
          value={formatTimestamp(purchase.createdAt)}
        />
      </div>
    </article>
  )
}

// =============================================================================
// Saved offer card
// =============================================================================

function SavedOfferCard({
  offer,
}: {
  offer: ReadOnlyCustomerSavedOffer
}) {
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="min-w-0 break-words text-base font-bold text-slate-950">
        {offer.offerTitle ?? 'Untitled offer'}
      </h4>

      {offer.businessName ? (
        <p className="mt-1 break-words text-sm text-slate-600">
          {offer.businessName}
        </p>
      ) : null}

      <div className="mt-3">
        <MetadataRow
          label="Saved"
          value={formatTimestamp(offer.createdAt)}
        />
      </div>
    </article>
  )
}

// =============================================================================
// Redemption card
// =============================================================================

function RedemptionCard({
  redemption,
}: {
  redemption: ReadOnlyCustomerRedemption
}) {
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="min-w-0 break-words text-base font-bold text-slate-950">
        {redemption.offerTitle ?? 'Untitled offer'}
      </h4>

      {redemption.businessName ? (
        <p className="mt-1 break-words text-sm text-slate-600">
          {redemption.businessName}
        </p>
      ) : null}

      <div className="mt-3">
        <MetadataRow
          label="Redeemed"
          value={formatTimestamp(redemption.createdAt)}
        />
      </div>
    </article>
  )
}

// =============================================================================
// Section header
// =============================================================================

function ActivitySubsectionHeader({
  label,
  title,
}: {
  label: string
  title: string
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>

        <h3 className="mt-1 break-words text-lg font-bold text-slate-950">
          {title}
        </h3>
      </div>

      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
        Read-only
      </span>
    </div>
  )
}

// =============================================================================
// Purchased passes subsection
// =============================================================================

function PurchasedPassesSubsection({
  purchases,
}: {
  purchases: ReadOnlyCustomerPurchase[]
}) {
  return (
    <div className="border-t border-slate-200 p-4 sm:p-6">
      <ActivitySubsectionHeader
        label="Customer purchases"
        title="Purchased passes"
      />

      <p className="mt-2 text-sm leading-6 text-slate-600">
        This support view displays real pass purchase records without
        edit controls.
      </p>

      <div className="mt-4">
        {purchases.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">
              This customer has not purchased any fundraiser passes
              yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {purchases.map((purchase) => (
              <PurchaseCard
                key={purchase.id}
                purchase={purchase}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Saved offers subsection
// =============================================================================

function SavedOffersSubsection({
  savedOffers,
}: {
  savedOffers: ReadOnlyCustomerSavedOffer[]
}) {
  return (
    <div className="border-t border-slate-200 p-4 sm:p-6">
      <ActivitySubsectionHeader
        label="Customer saved offers"
        title="Saved offers"
      />

      <p className="mt-2 text-sm leading-6 text-slate-600">
        This support view displays offers currently saved to the
        customer account without edit controls.
      </p>

      <div className="mt-4">
        {savedOffers.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">
              This customer has no saved offers.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {savedOffers.map((offer) => (
              <SavedOfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Redemption history subsection
// =============================================================================

function RedemptionHistorySubsection({
  redemptions,
}: {
  redemptions: ReadOnlyCustomerRedemption[]
}) {
  return (
    <div className="border-t border-slate-200 p-4 sm:p-6">
      <ActivitySubsectionHeader
        label="Customer redemptions"
        title="Redemption history"
      />

      <p className="mt-2 text-sm leading-6 text-slate-600">
        This support view displays the customer&apos;s coupon redemption
        history without edit controls.
      </p>

      <div className="mt-4">
        {redemptions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">
              This customer has no redemption history.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {redemptions.map((redemption) => (
              <RedemptionCard
                key={redemption.id}
                redemption={redemption}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Component
// =============================================================================

export default function ReadOnlyCustomerActivitySection({
  activityResult,
}: ReadOnlyCustomerActivitySectionProps) {
  if (!activityResult) {
    return (
      <section className="border-t border-slate-200 p-4 sm:p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">
            Customer activity could not be loaded for this workspace.
          </p>
        </div>
      </section>
    )
  }

  if (!activityResult.success) {
    return (
      <section className="border-t border-slate-200 p-4 sm:p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">
            {activityResult.message}
          </p>
        </div>
      </section>
    )
  }

  return (
    <>
      <PurchasedPassesSubsection
        purchases={activityResult.purchases}
      />
      <SavedOffersSubsection
        savedOffers={activityResult.savedOffers}
      />
      <RedemptionHistorySubsection
        redemptions={activityResult.redemptions}
      />
    </>
  )
}
