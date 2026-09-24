import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-[#F0F6FF] px-4 py-12">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Page not found</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">We couldn&apos;t find that RaiseHub page.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">The link may be outdated, or the page may not be available in this workspace.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-black text-white hover:bg-blue-700">Return to dashboard</Link>
          <Link href="/support?reportIssue=1&error=RaiseHub%20showed%20a%20page%20not%20found%20error.#contact" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-black text-slate-700 hover:bg-slate-50">Report this issue</Link>
        </div>
      </section>
    </main>
  )
}
