import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import EditOfferForm from './edit-offer-form'

type Props = {
  params: Promise<{ offerId: string }>
}

export default async function EditOfferPage({ params }: Props) {
  const { offerId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: offer } = await supabase
    .from('offers')
    .select('id, title, discount, description, starts_at, ends_at')
    .eq('id', offerId)
    .eq('business_id', user.id)
    .maybeSingle()

  if (!offer) notFound()

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-slate-50 to-white px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/offers" className="text-sm font-bold text-blue-700 hover:underline">
          ← Back to Offers
        </Link>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">Business workspace</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">Edit offer</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Update the customer-facing details and availability dates for this offer.</p>

          <div className="mt-7">
            <EditOfferForm offer={offer} />
          </div>
        </section>
      </div>
    </main>
  )
}
