import Link from 'next/link'

type Props = {
  showBusinessLink: boolean
  showOrganizationLink: boolean
}

export default function SupporterGrowthLinks({
  showBusinessLink,
  showOrganizationLink,
}: Props) {
  if (!showBusinessLink && !showOrganizationLink) {
    return null
  }

  return (
    <section className="mt-8 rounded-3xl border border-gray-200 bg-white/90 p-5 shadow-lg backdrop-blur sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Do more with RaiseHub
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {showBusinessLink ? (
          <Link
            href="/workspace/new/business"
            className="flex items-center justify-between gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm font-semibold text-green-800 transition hover:border-green-300 hover:bg-green-100"
          >
            <span>Join RaiseHub Partners</span>
            <span aria-hidden="true">→</span>
          </Link>
        ) : null}

        {showOrganizationLink ? (
          <Link
            href="/workspace/new/organization"
            className="flex items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100"
          >
            <span>Raise Funds for Your Organization</span>
            <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
    </section>
  )
}
