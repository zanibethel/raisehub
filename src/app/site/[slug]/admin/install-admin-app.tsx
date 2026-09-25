'use client'

import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type Props = {
  slug: string
  siteTitle: string
  themeColor: string
  logoUrl: string | null
}

export default function InstallBusinessAdminApp({ slug, siteTitle, themeColor, logoUrl }: Props) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    const manifestHref = `/site/${encodeURIComponent(slug)}/admin/manifest.webmanifest`
    let manifest = document.head.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    if (!manifest) {
      manifest = document.createElement('link')
      manifest.rel = 'manifest'
      document.head.appendChild(manifest)
    }
    manifest.href = manifestHref

    let theme = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!theme) {
      theme = document.createElement('meta')
      theme.name = 'theme-color'
      document.head.appendChild(theme)
    }
    theme.content = themeColor

    let title = document.head.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]')
    if (!title) {
      title = document.createElement('meta')
      title.name = 'apple-mobile-web-app-title'
      document.head.appendChild(title)
    }
    title.content = `${siteTitle} Admin`

    if (logoUrl) {
      let icon = document.head.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
      if (!icon) {
        icon = document.createElement('link')
        icon.rel = 'apple-touch-icon'
        document.head.appendChild(icon)
      }
      icon.href = logoUrl
    }

    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true)
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent))

    function onPrompt(event: Event) {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    function onInstalled() {
      setIsStandalone(true)
      setShowInstructions(false)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [logoUrl, siteTitle, slug, themeColor])

  if (isStandalone) {
    return <p className="mt-4 text-sm font-bold text-blue-800">Admin app is already running in standalone mode.</p>
  }

  async function install() {
    if (installPrompt) {
      await installPrompt.prompt()
      await installPrompt.userChoice
      setInstallPrompt(null)
      return
    }
    setShowInstructions(true)
  }

  return <div className="mt-4">
    <button type="button" onClick={install} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white">Install Admin App</button>
    {showInstructions ? <div className="mt-3 rounded-xl border border-blue-200 bg-white p-4 text-sm leading-6 text-blue-950">{isIos ? <p>On iPhone, tap Safari’s <strong>Share</strong> button, choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</p> : <p>Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>}</div> : null}
  </div>
}
