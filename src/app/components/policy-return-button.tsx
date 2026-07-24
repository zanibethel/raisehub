'use client'

import { useRouter } from 'next/navigation'

type PolicyReturnButtonProps = {
  fallbackHref?: string
  label?: string
}

export default function PolicyReturnButton({
  fallbackHref = '/dashboard',
  label = 'Return to campaign review',
}: PolicyReturnButtonProps) {
  const router = useRouter()

  function handleReturn() {
    router.push(fallbackHref)
  }

  return (
    <button
      type="button"
      onClick={handleReturn}
      className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-center font-semibold text-white hover:bg-blue-700 sm:w-auto"
    >
      ← {label}
    </button>
  )
}
