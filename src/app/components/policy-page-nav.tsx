import Link from 'next/link'

type PolicyPageNavProps = {
  active: 'terms' | 'privacy' | 'fundraising' | 'refund'
}

const items = [
  { key: 'terms', href: '/terms', label: 'Terms' },
  { key: 'privacy', href: '/privacy', label: 'Privacy' },
  { key: 'fundraising', href: '/fundraising-policy', label: 'Fundraising' },
  { key: 'refund', href: '/refund-policy', label: 'Refunds' },
] as const

export default function PolicyPageNav({ active }: PolicyPageNavProps) {
  return (
    <nav
      aria-label="RaiseHub policies"
      className="-mr-3 flex gap-2 overflow-x-auto pr-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mr-0 sm:pr-0"
    >
      {items.map((item) => {
        const isActive = item.key === active

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-3 text-xs font-black transition ${
              isActive
                ? 'border-blue-700 bg-blue-700 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
