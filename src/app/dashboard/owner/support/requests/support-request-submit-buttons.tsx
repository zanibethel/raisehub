'use client'

import { useFormStatus } from 'react-dom'

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  )
}

export default function SupportRequestSubmitButtons() {
  const { pending, data } = useFormStatus()
  const pendingIntent = pending ? data?.get('intent') : null

  return (
    <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row">
      <button
        type="submit"
        name="intent"
        value="save_draft"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 text-sm font-black text-blue-700 transition active:scale-[0.98] active:bg-blue-100 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
      >
        {pendingIntent === 'save_draft' ? <Spinner /> : null}
        {pendingIntent === 'save_draft' ? 'Saving…' : 'Save draft'}
      </button>

      <button
        type="submit"
        name="intent"
        value="publish_reply"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white transition active:scale-[0.98] active:bg-blue-900 disabled:cursor-wait disabled:bg-blue-500 sm:w-auto"
      >
        {pendingIntent === 'publish_reply' ? <Spinner /> : null}
        {pendingIntent === 'publish_reply'
          ? 'Publishing…'
          : 'Publish reply to customer'}
      </button>
    </div>
  )
}
