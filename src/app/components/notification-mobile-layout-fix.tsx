'use client'

export default function NotificationMobileLayoutFix() {
  return (
    <style jsx global>{`
      @media (max-width: 639px) {
        nav [role='region'][aria-label='Notifications'] {
          position: absolute !important;
          top: 4rem !important;
          right: 0.75rem !important;
          bottom: auto !important;
          left: auto !important;
          width: min(24rem, calc(100vw - 1.5rem)) !important;
          max-height: min(32rem, calc(100dvh - 5.5rem)) !important;
          border-radius: 1rem !important;
          overflow: hidden !important;
        }
      }
    `}</style>
  )
}
