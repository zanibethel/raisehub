'use client'

import { useFormStatus } from 'react-dom'

export default function CreateRouteSubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          Creating route…
        </>
      ) : (
        'Add email route'
      )}
    </button>
  )
}
