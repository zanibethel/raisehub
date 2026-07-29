'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type MobileNavEnhancementsProps = {
  signedIn: boolean
  profileHref: string | null
}

export default function MobileNavEnhancements({
  signedIn,
  profileHref,
}: MobileNavEnhancementsProps) {
  const [profileSlot, setProfileSlot] = useState<HTMLElement | null>(null)
  const [roleActionsSlot, setRoleActionsSlot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    function syncOpenMenu() {
      const closeButton = document.querySelector<HTMLButtonElement>(
        'nav [aria-label="Close menu"]'
      )
      const menuRoot = closeButton?.parentElement
      const panel = closeButton?.nextElementSibling as HTMLElement | null
      const menuLinks = panel?.querySelector('nav') as HTMLElement | null
      const accountEmail = panel?.querySelector('p') as HTMLElement | null

      document
        .querySelectorAll('[data-raisehub-auth-menu]')
        .forEach((element) => element.removeAttribute('data-raisehub-auth-menu'))

      document
        .querySelectorAll('[data-raisehub-account-menu]')
        .forEach((element) => element.removeAttribute('data-raisehub-account-menu'))

      document
        .querySelectorAll('[data-raisehub-account-email]')
        .forEach((element) => element.removeAttribute('data-raisehub-account-email'))

      if (menuLinks?.querySelector('a[href="/login"]')) {
        menuLinks.setAttribute('data-raisehub-auth-menu', 'true')
      }

      if (menuLinks) {
        let roleSlot = menuLinks.querySelector<HTMLElement>(
          '[data-raisehub-role-actions-slot]'
        )

        if (!roleSlot) {
          roleSlot = document.createElement('div')
          roleSlot.setAttribute('data-raisehub-role-actions-slot', 'true')

          const signOutButton = Array.from(
            menuLinks.querySelectorAll<HTMLButtonElement>('button')
          ).find((button) => button.textContent?.includes('Sign out'))
          const loginLink = menuLinks.querySelector('a[href="/login"]')

          menuLinks.insertBefore(
            roleSlot,
            signOutButton ?? loginLink ?? menuLinks.firstElementChild
          )
        }

        setRoleActionsSlot(roleSlot)
      } else {
        setRoleActionsSlot(null)
      }

      if (signedIn && menuLinks) {
        menuLinks.setAttribute('data-raisehub-account-menu', 'true')
        accountEmail?.setAttribute('data-raisehub-account-email', 'true')

        if (profileHref) {
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
          menuLinks
            .querySelector('[data-raisehub-profile-slot]')
            ?.remove()
          setProfileSlot(null)
        }
      } else {
        setProfileSlot(null)
      }

      return { closeButton, menuRoot, panel }
    }

    syncOpenMenu()

    const observer = new MutationObserver(syncOpenMenu)
    observer.observe(document.body, { childList: true, subtree: true })

    function handlePointerDown(event: PointerEvent) {
      const { closeButton, menuRoot } = syncOpenMenu()
      if (!closeButton || !menuRoot) return
      if (!menuRoot.contains(event.target as Node)) closeButton.click()
    }

    function handleMenuSelection(event: MouseEvent) {
      const { closeButton, panel } = syncOpenMenu()
      if (!closeButton || !panel) return

      const selectedAction = (event.target as Element | null)?.closest('a, button')
      if (!selectedAction || !panel.contains(selectedAction)) return

      closeButton.click()
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('click', handleMenuSelection)

    return () => {
      observer.disconnect()
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('click', handleMenuSelection)
    }
  }, [profileHref, signedIn])

  return (
    <>
      {roleActionsSlot
        ? createPortal(
            <div className="my-2 border-y border-gray-100 py-2">
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Choose your path
              </p>
              <Link
                href="/signup/organization"
                className="block rounded-xl px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                Start a Fundraiser
              </Link>
              <Link
                href="/signup/business"
                className="block rounded-xl px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
              >
                Join as a Business
              </Link>
              <Link
                href="/signup?source=offers"
                className="block rounded-xl px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
              >
                View Local Deals
              </Link>
            </div>,
            roleActionsSlot
          )
        : null}

      {profileSlot && profileHref
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

          nav [data-raisehub-account-email='true'] {
            text-align: right;
          }

          nav [data-raisehub-account-menu='true'] > a,
          nav [data-raisehub-account-menu='true'] > button,
          nav [data-raisehub-account-menu='true'] > [data-raisehub-profile-slot] > a {
            text-align: right;
          }

          nav [data-raisehub-account-menu='true'] > button {
            display: block;
          }

          nav [data-raisehub-role-actions-slot='true'] a,
          nav [data-raisehub-role-actions-slot='true'] p {
            text-align: right;
          }
        }
      `}</style>
    </>
  )
}
