import type { OfferRedemptionChannel } from '@/lib/offers/online-redemption'

export type OnlineRedemptionDraft = {
  redemptionChannel: OfferRedemptionChannel
  onlineStoreUrl: string
  discountCode: string
  discountUrl: string
  onlineRedemptionInstructions: string
}

type Props = {
  draft: OnlineRedemptionDraft
  onChange: <Key extends keyof OnlineRedemptionDraft>(
    key: Key,
    value: OnlineRedemptionDraft[Key]
  ) => void
}

const channelOptions: Array<{
  value: OfferRedemptionChannel
  label: string
  description: string
}> = [
  {
    value: 'in_person',
    label: 'In person',
    description: 'Customers show the offer at your physical location.',
  },
  {
    value: 'online',
    label: 'Online',
    description: 'Customers use a store link, coupon code, or discount link.',
  },
  {
    value: 'both',
    label: 'In person and online',
    description: 'Customers can choose either redemption option.',
  },
]

export default function OnlineRedemptionFields({ draft, onChange }: Props) {
  const supportsOnline =
    draft.redemptionChannel === 'online' || draft.redemptionChannel === 'both'

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="font-bold text-gray-900">Where can customers use this offer?</h2>
      <p className="mt-1 text-sm text-gray-600">
        Choose this per offer. A business can publish separate in-person and online deals.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {channelOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange('redemptionChannel', option.value)}
            className={`rounded-xl border p-4 text-left transition ${
              draft.redemptionChannel === option.value
                ? 'border-blue-600 bg-blue-50 text-blue-800'
                : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
            }`}
          >
            <span className="block text-sm font-bold">{option.label}</span>
            <span className="mt-1 block text-xs leading-5">{option.description}</span>
          </button>
        ))}
      </div>

      {supportsOnline ? (
        <div className="mt-5 space-y-4 rounded-2xl border border-green-200 bg-green-50 p-4">
          <label className="block">
            <span className="text-sm font-bold text-gray-800">Online store URL</span>
            <input
              type="url"
              inputMode="url"
              value={draft.onlineStoreUrl}
              onChange={(event) => onChange('onlineStoreUrl', event.target.value)}
              placeholder="https://store.example.com"
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-gray-800">Discount code</span>
            <p className="mt-1 text-xs text-gray-600">
              Optional. RaiseHub keeps the exact capitalization you enter.
            </p>
            <input
              value={draft.discountCode}
              onChange={(event) => onChange('discountCode', event.target.value)}
              placeholder="RAISEHUB15"
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 font-mono outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-gray-800">Discount link</span>
            <p className="mt-1 text-xs text-gray-600">
              Optional. Use a link supplied by your store that already applies the coupon. This link takes priority over the normal store URL.
            </p>
            <input
              type="url"
              inputMode="url"
              value={draft.discountUrl}
              onChange={(event) => onChange('discountUrl', event.target.value)}
              placeholder="https://store.example.com/discount/RAISEHUB15"
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-gray-800">Online instructions</span>
            <textarea
              value={draft.onlineRedemptionInstructions}
              onChange={(event) =>
                onChange('onlineRedemptionInstructions', event.target.value)
              }
              rows={3}
              placeholder="Example: Add eligible accessories to your cart, then enter the code at checkout."
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500"
            />
          </label>

          <p className="rounded-xl bg-white p-3 text-xs leading-5 text-green-900">
            Opening the store or copying the code will be tracked as engagement, not as a completed redemption.
          </p>
        </div>
      ) : null}
    </section>
  )
}
