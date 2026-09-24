import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#F7FAFC] px-3 py-8 text-slate-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-xl">
        <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-8 text-white shadow-xl sm:px-8 sm:py-10">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
              Page not found
            </p>
            <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-xl font-black text-slate-200">
              404
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">
              We couldn&apos;t find that RaiseHub page
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              The link may be outdated, or the page may not be available in this workspace.
            </p>
          </div>
        </section>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/dashboard"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 px-5 text-center text-sm font-black text-white transition hover:bg-blue-800"
          >
            Return to Dashboard
          </Link>
          <Link
            href="/support?reportIssue=1&error=RaiseHub%20showed%20a%20page%20not%20found%20error.#contact"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-center text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Report This Issue
          </Link>
        </div>
      </div>
    </main>
  )
}
