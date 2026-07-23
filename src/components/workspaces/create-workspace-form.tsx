'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { createClient } from '@/lib/supabase/client'

type WorkspaceKind = 'business' | 'organization'

type Props = {
  kind: WorkspaceKind
}

const COPY = {
  business: {
    eyebrow: 'RaiseHub Partners',
    title: 'Join RaiseHub Partners',
    description:
      'Add a business workspace to your existing RaiseHub account. Your Supporter access and purchased passes will stay intact.',
    label: 'Business name',
    placeholder: 'Example: Elysian Hair Salon',
    button: 'Create Business Workspace',
    creating: 'Creating business workspace…',
    rpc: 'create_business_workspace',
    keyPrefix: 'business',
    accent: 'green',
  },
  organization: {
    eyebrow: 'RaiseHub Fundraising',
    title: 'Raise Funds for Your Organization',
    description:
      'Add an organization workspace to your existing RaiseHub account. Your Supporter access and purchased passes will stay intact.',
    label: 'Organization name',
    placeholder: 'Example: Lincoln Middle School PTA',
    button: 'Create Organization Workspace',
    creating: 'Creating organization workspace…',
    rpc: 'create_organization_workspace',
    keyPrefix: 'organization',
    accent: 'blue',
  },
} as const

export default function CreateWorkspaceForm({ kind }: Props) {
  const router = useRouter()
  const copy = COPY[kind]
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setMessage(`${copy.label} is required.`)
      return
    }

    setLoading(true)
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.replace(`/login?next=/workspace/new/${kind}`)
      return
    }

    const { data, error } = await supabase.rpc(copy.rpc, {
      p_name: trimmedName,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const workspaceId = typeof data === 'string' ? data : null
    if (!workspaceId) {
      setMessage('The workspace was created, but RaiseHub could not open it automatically.')
      setLoading(false)
      return
    }

    router.push(
      `/dashboard?workspace=${encodeURIComponent(
        `${copy.keyPrefix}:${workspaceId}`
      )}`
    )
    router.refresh()
  }

  const isBusiness = kind === 'business'

  return (
    <main className="min-h-screen bg-[#F0F6FF] px-4 py-8 sm:px-8 sm:py-12">
      <section className="mx-auto max-w-xl rounded-3xl border border-gray-200 bg-white p-6 shadow-xl sm:p-8">
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          ← Back to dashboard
        </Link>

        <p
          className={`mt-6 text-xs font-bold uppercase tracking-[0.18em] ${
            isBusiness ? 'text-green-700' : 'text-blue-700'
          }`}
        >
          {copy.eyebrow}
        </p>

        <h1 className="mt-3 text-3xl font-bold text-gray-900">
          {copy.title}
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          {copy.description}
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <label className="block">
            <span className="text-sm font-semibold text-gray-800">
              {copy.label}
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={copy.placeholder}
              disabled={loading}
              className={`mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition disabled:bg-gray-100 ${
                isBusiness
                  ? 'focus:border-green-500 focus:ring-2 focus:ring-green-100'
                  : 'focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
              }`}
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-xl px-5 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isBusiness
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? copy.creating : copy.button}
          </button>
        </form>

        {message ? (
          <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </p>
        ) : null}

        <p className="mt-6 text-xs leading-5 text-gray-500">
          This adds a new experience to your current account. It does not create a second login or remove your Supporter access.
        </p>
      </section>
    </main>
  )
}
