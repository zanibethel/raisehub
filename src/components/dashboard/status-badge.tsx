type StatusBadgeProps = {
  label: string
  status?: 'active' | 'paused' | 'pending' | 'complete' | 'warning'
}

const statusClasses = {
  active: 'border-green-200 bg-green-50 text-green-700',
  paused: 'border-gray-200 bg-gray-100 text-gray-700',
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
