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
    <main className="flex min-h-[60vh] items-center justify-center bg-[#F0F6FF] px-4 py-12">
      <section className="w-full max-w-xl rounded-3xl border border-rose-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-600">Something went wrong</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">This part of RaiseHub didn&apos;t load.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Try again first. If it keeps happening, report the issue and RaiseHub will attach the page and error reference automatically.
        </p>
        {error.digest ? <p className="mt-3 text-xs font-semibold text-slate-500">Reference: {error.digest}</p> : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-black text-white hover:bg-blue-700">
            Try again
          </button>
          <Link href={`/support?${params.toString()}#contact`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-5 text-sm font-black text-rose-700 hover:bg-rose-100">
            Report this issue
          </Link>
        </div>
      </section>
    </main>
  )
}
