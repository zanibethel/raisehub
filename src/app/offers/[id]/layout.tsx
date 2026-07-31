import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { createClient } from '@/lib/supabase/server'

type OfferLayoutProps = {
  children: ReactNode
  params: Promise<{ id: string }>
}

export default async function OfferLayout({ children, params }: OfferLayoutProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const [{ data: offer }, { data: profile }] = await Promise.all([
      supabase
        .from('offers')
        .select('business_id')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle(),
    ])

    const viewerRole = profile?.role?.toLowerCase()
    const canPreview =
      offer?.business_id === user.id ||
      viewerRole === 'owner' ||
      viewerRole === 'admin'

    if (canPreview) {
      redirect(`/offers/business/${id}`)
    }
  }

  return children
}
