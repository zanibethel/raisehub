// =============================================================================
// Types
// =============================================================================

type AdminOverviewItem = {
  title: string
  description: string
}

// =============================================================================
// Data
// =============================================================================

const overviewItems: AdminOverviewItem[] = [
  {
    title: 'Users',
    description: 'Manage users, businesses, and organizations.',
  },
  {
    title: 'Campaigns',
    description: 'Review active fundraiser campaigns.',
  },
  {
    title: 'Platform settings',
    description: 'Configure platform-wide behavior here.',
  },
]

// =============================================================================
// Component
// =============================================================================

export default function AdminOverviewSection() {
  return (
    <section className="mt-8 grid gap-4 md:grid-cols-3">
      {overviewItems.map((item) => (
        <article
          key={item.title}
          className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-xl backdrop-blur"
        >
          <h2 className="text-lg font-semibold text-gray-800">
            {item.title}
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            {item.description}
          </p>
        </article>
      ))}
    </section>
  )
}