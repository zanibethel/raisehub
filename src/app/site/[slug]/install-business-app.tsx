'use client'

import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

type InstallBusinessAppProps = {
  slug: string
  siteTitle: string
  themeColor: string
  logoUrl: string | null
}

function ensureMeta(name: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.name = name
    document.head.appendChild(element)
  }
  element.content = content
}

export default function InstallBusinessApp({
  slug,
  siteTitle,
  themeColor,
  logoUrl,
}: InstallBusinessAppProps) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    const manifestHref = `/site/${encodeURIComponent(slug)}/manifest.webmanifest`
    let manifest = document.head.querySelector<HTMLLinkElement>('link[rel="manifest"]')

    if (!manifest) {
      manifest = document.createElement('link')
      manifest.rel = 'manifest'
      document.head.appendChild(manifest)
    }

    manifest.href = manifestHref

    ensureMeta('theme-color', themeColor)
    ensureMeta('apple-mobile-web-app-capable', 'yes')
    ensureMeta('apple-mobile-web-app-status-bar-style', 'default')
    ensureMeta('apple-mobile-web-app-title', siteTitle)

    if (logoUrl) {
      let appleIcon = document.head.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
      if (!appleIcon) {
        appleIcon = document.createElement('link')
        appleIcon.rel = 'apple-touch-icon'
        document.head.appendChild(appleIcon)
      }
      appleIcon.href = logoUrl
    }

    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      navigatorWithStandalone.standalone === true

    setIsStandalone(standalone)
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent))

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    function onInstalled() {
      setInstallPrompt(null)
      setIsStandalone(true)
      setShowInstructions(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [logoUrl, siteTitle, slug, themeColor])

  if (isStandalone) return null

  async function install() {
    if (installPrompt) {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null)
      }
      return
    }

    setShowInstructions(true)
  }

  return (
    <section className="border-t px-5 py-8" style={{ borderColor: 'rgba(100,116,139,.22)' }}>
      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            Business app
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            Put {siteTitle} on your Home Screen
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Open this business like an app with its own name, icon, and full-screen launch.
          </p>
        </div>

        <button
          type="button"
          onClick={install}
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 sm:mt-0 sm:w-auto"
        >
          Install app
        </button>
      </div>

      {showInstructions ? (
        <div className="mx-auto mt-3 max-w-5xl rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
          {isIos ? (
            <p>
              On iPhone: tap Safari&apos;s <strong>Share</strong> button, choose{' '}
              <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
            </p>
          ) : (
            <p>
              Open your browser menu and choose <strong>Install app</strong> or{' '}
              <strong>Add to Home screen</strong>.
            </p>
          )}
        </div>
      ) : null}
    </section>
  )
}
