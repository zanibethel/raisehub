export default function GlobalLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading the next page"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/20 px-4 backdrop-blur-[1px]"
    >
      <div className="flex min-w-44 flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-2xl">
        <span
          aria-hidden="true"
          className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"
        />
        <p className="mt-3 text-sm font-bold text-slate-900">Loading…</p>
        <p className="mt-1 text-center text-xs text-slate-500">
          Opening your next workspace view
        </p>
      </div>
    </div>
  )
}
