type StatusBadgeProps = {
  label: string
  status?:
    | 'active'
    | 'paused'
    | 'expired'
    | 'pending'
    | 'complete'
    | 'warning'
}

const statusClasses = {
  active: 'border-green-200 bg-green-50 text-green-700',
  paused: 'border-rose-200 bg-rose-50 text-rose-700',
  expired: 'border-red-200 bg-red-50 text-red-700',
  pending: 'border-blue-200 bg-blue-50 text-blue-700',
  complete: 'border-green-200 bg-green-50 text-green-700',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
}

export default function StatusBadge({
  label,
  status = 'pending',
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[status]}`}
    >
      {label}
    </span>
  )
}