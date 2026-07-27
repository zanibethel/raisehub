'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type MobileNavEnhancementsProps = {
  signedIn: boolean
  profileHref: string
}

export default function MobileNavEnhancements({
  signedIn,
  profileHref,
}: MobileNavEnhancementsProps) {
  const [profileSlot, setProfileSlot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    function syncOpenMenu() {
      const closeButton = document.querySelector<HTMLButtonElement>(
        'nav [aria-label="Close menu"]'
      )
      const menuRoot = closeButton?.parentElement
      const panel = closeButton?.nextElementSibling as HTMLElement | null
      const menuLinks = panel?.querySelector('nav') as HTMLElement | null

      document
        .querySelectorAll('[data-raisehub-auth-menu]')
        .forEach((element) => element.removeAttribute('data-raisehub-auth-menu'))

      if (menuLinks?.querySelector('a[href="/login"]')) {
        menuLinks.setAttribute('data-raisehub-auth-menu', 'true')
      }

      if (signedIn && menuLinks) {
        let slot = menuLinks.querySelector<HTMLElement>(
          '[data-raisehub-profile-slot]'
        )

        if (!slot) {
          slot = document.createElement('div')
          slot.setAttribute('data-raisehub-profile-slot', 'true')
          const notificationLink = menuLinks.querySelector(
            'a[href="/dashboard/notifications"]'
          )
          menuLinks.insertBefore(slot, notificationLink ?? menuLinks.lastElementChild)
        }

        setProfileSlot(slot)
      } else {
        setProfileSlot(null)
      }

      return { closeButton, menuRoot }
    }

    syncOpenMenu()

    const observer = new MutationObserver(syncOpenMenu)
    observer.observe(document.body, { childList: true, subtree: true })

    function handlePointerDown(event: PointerEvent) {
      const { closeButton, menuRoot } = syncOpenMenu()
      if (!closeButton || !menuRoot) return
      if (!menuRoot.contains(event.target as Node)) closeButton.click()
    }

    document.addEventListener('pointerdown', handlePointerDown, true)

    return () => {
      observer.disconnect()
      document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [signedIn])

  return (
    <>
      {profileSlot
        ? createPortal(
            <Link
              href={profileHref}
              className="block rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Edit profile
            </Link>,
            profileSlot
          )
        : null}

      <style jsx global>{`
        @media (max-width: 639px) {
          nav [data-raisehub-auth-menu='true'] {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 0.75rem;
          }

          nav [data-raisehub-auth-menu='true'] > a {
            width: auto;
            min-width: 6.5rem;
            text-align: center;
            font-weight: 700;
          }

          nav [data-raisehub-auth-menu='true'] > a[href='/signup'] {
            background: rgb(37 99 235);
            color: white;
          }

          nav [data-raisehub-auth-menu='true'] > a[href='/signup']:hover {
            background: rgb(29 78 216);
          }
        }
      `}</style>
    </>
  )
}
