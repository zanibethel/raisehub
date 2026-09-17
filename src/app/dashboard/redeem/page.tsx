import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import RedemptionConfirmationForm from './redemption-confirmation-form'

type Props = {
  searchParams?: Promise<{ code?: string }>
}

function normalizeCode(value?: string) {
  const normalized = value?.trim().toUpperCase() ?? ''
  return /^[A-Z0-9]{6}$/.test(normalized) ? normalized : ''
}

export default async function ConfirmRedemptionPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {}
  const initialCode = normalizeCode(params.code)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const next = initialCode
      ? `/dashboard/redeem?code=${encodeURIComponent(initialCode)}`
      : '/dashboard/redeem'
    redirect(`/login?next=${encodeURIComponent(next)}`)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-slate-50 to-white px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-xl">
        <Link
          href="/dashboard"
          className="text-sm font-bold text-blue-700 underline-offset-4 hover:underline"
        >
          ← Back to Business Dashboard
        </Link>

        <section className="mt-4 rounded-3xl border border-green-100 bg-white p-5 shadow-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
            Optional checkout tool
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Instant Verification
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Customers do not need staff approval for every redemption. Scan their RaiseHub QR code or enter the short verification code when you want to confirm a redemption immediately instead of letting the normal 24-hour review window auto-confirm it.
          </p>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
              Optional counter workflow
            </p>
            <ol className="mt-2 space-y-2 text-sm leading-6 text-blue-950">
              <li><strong>1.</strong> The supporter taps Redeem Offer and the redemption is recorded immediately.</li>
              <li><strong>2.</strong> Their screen shows a short-lived QR code and 6-character fallback code.</li>
              <li><strong>3.</strong> Scan the QR with your phone camera or enter the code here, then tap Verify Now.</li>
              <li><strong>4.</strong> If you do nothing, the redemption auto-confirms after 24 hours unless your business reports a problem.</li>
            </ol>
          </div>

          <RedemptionConfirmationForm initialCode={initialCode} />
        </section>
      </div>
    </main>
  )
}
