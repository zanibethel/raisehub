import Link from 'next/link'
import { redirect } from 'next/navigation'

import OwnerWorkspaceShell from '@/components/dashboards/owner/owner-workspace-shell'
import { createClient } from '@/lib/supabase/server'
import { updateSignupReview } from './actions'

export const metadata = {
  title: 'Recent Signups | RaiseHub Owner Console',
}

type RoleFilter = 'all' | 'business' | 'organization' | 'customer'
type ReviewStatus = 'new' | 'reviewed' | 'needs_attention'

type PageProps = {
  searchParams?: Promise<{ role?: string; status?: string }>
}

type ProfileRow = {
  id: string
  email: string | null
  role: string
  full_name: string | null
  display_name: string | null
  business_name: string | null
  onboarding_completed: boolean
  is_demo: boolean
  created_at: string
  updated_at: string
}

type ReviewRow = {
  profile_id: string
  status: ReviewStatus
  reviewed_at: string | null
}

function labelForRole(role: string) {
  if (role === 'business') return 'Business'
  if (role === 'organization') return 'Organization'
  if (role === 'customer') return 'Supporter'
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function displayName(profile: ProfileRow) {
  return profile.business_name || profile.display_name || profile.full_name || profile.email || 'Unnamed account'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export default async function RecentSignupsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>()

  if (ownerProfile?.role !== 'owner') redirect('/dashboard')

  const params = (await searchParams) ?? {}
  const role: RoleFilter = ['business', 'organization', 'customer'].includes(params.role ?? '')
    ? (params.role as RoleFilter)
    : 'all'
  const status = ['new', 'reviewed', 'needs_attention'].includes(params.status ?? '')
    ? (params.status as ReviewStatus)
    : null

  let profileQuery = supabase
    .from('profiles')
    .select('id, email, role, full_name, display_name, business_name, onboarding_completed, is_demo, created_at, updated_at')
    .neq('role', 'owner')
    .order('created_at', { ascending: false })
    .limit(100)

  if (role !== 'all') profileQuery = profileQuery.eq('role', role)

  const [{ data: profileData, error: profileError }, { data: reviewData }] = await Promise.all([
    profileQuery,
    supabase.from('owner_signup_reviews').select('profile_id, status, reviewed_at'),
  ])

  const reviews = new Map(
    ((reviewData ?? []) as ReviewRow[]).map((row) => [row.profile_id, row])
  )

  const rows = ((profileData ?? []) as ProfileRow[]).filter((profile) => {
    const reviewStatus = reviews.get(profile.id)?.status ?? 'new'
    return status ? reviewStatus === status : true
  })

  const tabs: Array<{ label: string; value: RoleFilter }> = [
    { label: 'All', value: 'all' },
    { label: 'Businesses', value: 'business' },
    { label: 'Organizations', value: 'organization' },
    { label: 'Supporters', value: 'customer' },
  ]

  return (
    <OwnerWorkspaceShell view="manage" detail="Recent signups">
      <div className="mt-8 space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <Link href="/dashboard/owner/manage" className="text-sm font-bold text-blue-700 hover:text-blue-900">
            ← Manage Platform
          </Link>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Accounts</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Recent signups</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Review newly created RaiseHub accounts, see onboarding progress, separate live from demo data, and flag anything that needs follow-up.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => {
              const query = new URLSearchParams()
              if (tab.value !== 'all') query.set('role', tab.value)
              if (status) query.set('status', status)
              const href = `/dashboard/owner/manage/recent-signups${query.size ? `?${query.toString()}` : ''}`
              return (
                <Link
                  key={tab.value}
                  href={href}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-black ${role === tab.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(['new', 'needs_attention', 'reviewed'] as ReviewStatus[]).map((value) => {
              const query = new URLSearchParams()
              if (role !== 'all') query.set('role', role)
              if (status !== value) query.set('status', value)
              return (
                <Link
                  key={value}
                  href={`/dashboard/owner/manage/recent-signups${query.size ? `?${query.toString()}` : ''}`}
                  className={`rounded-full px-3 py-1.5 text-xs font-black ${status === value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {value === 'needs_attention' ? 'Needs attention' : value.charAt(0).toUpperCase() + value.slice(1)}
                </Link>
              )
            })}
          </div>
        </section>

        {profileError ? (
          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-800">
            Recent signups could not be loaded.
          </section>
        ) : rows.length === 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-black text-slate-950">No signups in this view</h2>
            <p className="mt-2 text-sm text-slate-600">Try another account type or review-status filter.</p>
          </section>
        ) : (
          <section className="space-y-3">
            {rows.map((profile) => {
              const review = reviews.get(profile.id)
              const reviewStatus = review?.status ?? 'new'
              const onboardingLabel = profile.onboarding_completed ? 'Profile complete' : profile.updated_at > profile.created_at ? 'Profile started' : 'Account created'
              const reviewUrl = `/dashboard/owner/support?workspaceId=${encodeURIComponent(profile.id)}&workspaceRole=${encodeURIComponent(profile.role)}`

              return (
                <article key={profile.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{labelForRole(profile.role)}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${profile.is_demo ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {profile.is_demo ? 'Demo' : 'Live'}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{onboardingLabel}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${reviewStatus === 'reviewed' ? 'bg-emerald-50 text-emerald-700' : reviewStatus === 'needs_attention' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-700'}`}>
                          {reviewStatus === 'needs_attention' ? 'Needs attention' : reviewStatus.charAt(0).toUpperCase() + reviewStatus.slice(1)}
                        </span>
                      </div>

                      <h2 className="mt-3 break-words text-xl font-black text-slate-950">{displayName(profile)}</h2>
                      <p className="mt-1 break-all text-sm font-semibold text-slate-600">{profile.email ?? 'No email available'}</p>
                      <p className="mt-2 text-xs text-slate-500">Signed up {formatDate(profile.created_at)}</p>
                      {review?.reviewed_at ? <p className="mt-1 text-xs text-slate-500">Last reviewed {formatDate(review.reviewed_at)}</p> : null}
                    </div>

                    <Link
                      href={reviewUrl}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700"
                    >
                      Review profile
                    </Link>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <form action={updateSignupReview}>
                      <input type="hidden" name="profile_id" value={profile.id} />
                      <input type="hidden" name="status" value="reviewed" />
                      <button type="submit" className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                        Mark reviewed
                      </button>
                    </form>
                    <form action={updateSignupReview}>
                      <input type="hidden" name="profile_id" value={profile.id} />
                      <input type="hidden" name="status" value="needs_attention" />
                      <button type="submit" className="rounded-xl bg-amber-50 px-4 py-2 text-xs font-black text-amber-800 ring-1 ring-amber-200">
                        Needs attention
                      </button>
                    </form>
                    {reviewStatus !== 'new' ? (
                      <form action={updateSignupReview}>
                        <input type="hidden" name="profile_id" value={profile.id} />
                        <input type="hidden" name="status" value="new" />
                        <button type="submit" className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
                          Reset to new
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </OwnerWorkspaceShell>
  )
}
