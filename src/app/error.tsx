'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const params = new URLSearchParams({
    reportIssue: '1',
    source: typeof window === 'undefined' ? '' : window.location.href,
    error: 'This page encountered an unexpected error.',
  })
  if (error.digest) params.set('ref', error.digest)

  return (
    <main className="min-h-screen bg-[#F7FAFC] px-3 py-8 text-slate-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-xl">
        <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-8 text-white shadow-xl sm:px-8 sm:py-10">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-rose-500/20 blur-3xl" />
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">
              Something went wrong
            </p>
            <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-400/15 text-2xl font-black text-rose-200">
              !
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">
              This part of RaiseHub didn&apos;t load
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Try again first. If it keeps happening, report the issue and RaiseHub will attach the page and error reference automatically.
            </p>
          </div>
        </section>

        {error.digest ? (
          <div className="mt-5 border-y border-slate-200 py-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Error reference
            </p>
            <code className="mt-1 block break-all text-sm font-bold text-slate-700">
              {error.digest}
            </code>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            onClick={reset}
            className="min-h-12 rounded-xl bg-blue-700 px-5 text-sm font-black text-white transition hover:bg-blue-800"
          >
            Try Again
          </button>
          <Link
            href={`/support?${params.toString()}#contact`}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-5 text-center text-sm font-black text-rose-700 transition hover:bg-rose-100"
          >
            Report This Issue
          </Link>
        </div>
      </div>
    </main>
  )
}
