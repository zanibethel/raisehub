import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import RedemptionConfirmationForm from './redemption-confirmation-form'

export default async function ConfirmRedemptionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/dashboard/redeem')
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
            Checkout tool
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Confirm Redemption
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Enter the short-lived code shown on the supporter’s RaiseHub Pass. A redemption is recorded only after a business confirms it here.
          </p>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
              Counter workflow
            </p>
            <ol className="mt-2 space-y-2 text-sm leading-6 text-blue-950">
              <li><strong>1.</strong> Supporter opens the saved offer and taps Redeem Offer.</li>
              <li><strong>2.</strong> They show you the 6-character code.</li>
              <li><strong>3.</strong> Enter it below and confirm.</li>
              <li><strong>4.</strong> Both sides receive confirmation and the redemption appears in reporting.</li>
            </ol>
          </div>

          <RedemptionConfirmationForm />
        </section>
      </div>
    </main>
  )
}
