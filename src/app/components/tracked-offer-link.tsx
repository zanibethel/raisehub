'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type TrackedOfferLinkProps = {
  offerId: string
  clickType: string
  href: string
  children: React.ReactNode
  className?: string
}

export default function TrackedOfferLink({
  offerId,
  clickType,
  href,
  children,
  className,
}: TrackedOfferLinkProps) {
  const router = useRouter()
  const supabase = createClient()

  // =========================================
  // 🖱️ TRACK CLICK BEFORE NAVIGATION
  // =========================================
  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('offer_clicks').insert({
      offer_id: offerId,
      user_id: user?.id ?? null,
      click_type: clickType,
    })

    if (error) {
      console.error('offer click tracking failed:', error)
    }

    router.push(href)
  }

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  )
}