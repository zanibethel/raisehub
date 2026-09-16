import { redirect } from 'next/navigation'

import OwnerWorkspaceShell from '@/components/dashboards/owner/owner-workspace-shell'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  createSpotlightCampaignAction,
  deleteSpotlightCampaignAction,
  toggleSpotlightCampaignAction,
} from './actions'

export const metadata = {
  title: 'Spotlights | RaiseHub Owner Console',
}

type CampaignRow = {
  id: string
  title: string
  body: string | null
  kind: string
  audience_roles: string[]
  environment_scope: string
  priority: number
  starts_at: string
  ends_at: string | null
  is_active: boolean
  dismissible: boolean
  max_views_per_user: number
  repeat_after_hours: number | null
  cta_label: string | null
  cta_url: string | null
  created_at: string
}

type InteractionRow = {
  campaign_id: string
  view_count: number
  clicked_at: string | null
  dismissed_at: string | null
}

function formatDate(value: string | null) {
  if (!value) return 'No end date'
  return new Date(value).toLocaleString()
}

export default async function OwnerSpotlightsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>()
  if (profile?.role !== 'owner') redirect('/dashboard')

  const admin = createAdminClient() as any
  const [campaignsResult, interactionsResult] = await Promise.all([
    admin.from('spotlight_campaigns').select('*').order('created_at', { ascending: false }),
    admin.from('spotlight_interactions').select('campaign_id, view_count, clicked_at, dismissed_at'),
  ])

  const campaigns = (campaignsResult.data ?? []) as CampaignRow[]
  const interactions = (interactionsResult.data ?? []) as InteractionRow[]
  const metrics = new Map<string, { views: number; clicks: number; dismissals: number }>()

  for (const interaction of interactions) {
    const current = metrics.get(interaction.campaign_id) ?? { views: 0, clicks: 0, dismissals: 0 }
    current.views += interaction.view_count
    if (interaction.clicked_at) current.clicks += 1
    if (interaction.dismissed_at) current.dismissals += 1
    metrics.set(interaction.campaign_id, current)
  }

  return (
    <OwnerWorkspaceShell view="manage" detail="Spotlights">
      <div className="mt-8 space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Promotion system</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">RaiseHub Spotlights</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Create targeted login carousel cards for announcements, upgrades, featured businesses, fundraisers, and important platform actions. Only the three highest-priority eligible cards are shown at a time.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-green-700">Create</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">New Spotlight</h2>
            </div>
            <p className="max-w-xl text-xs leading-5 text-slate-500">Start with one or two useful cards. Avoid filling the login experience with low-priority promotions.</p>
          </div>

          <form action={createSpotlightCampaignAction} className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">Headline</span>
              <input name="title" required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Build your free RaiseHub website" />
            </label>

            <label className="sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">Message</span>
              <textarea name="body" rows={3} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Short, useful explanation of why this matters." />
            </label>

            <label>
              <span className="text-sm font-bold text-slate-700">Type</span>
              <select name="kind" defaultValue="announcement" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3">
                <option value="announcement">Announcement</option>
                <option value="upgrade">Upgrade</option>
                <option value="business_promo">Featured Business</option>
                <option value="organization_promo">Featured Fundraiser</option>
                <option value="system">RaiseHub Update</option>
              </select>
            </label>

            <label>
              <span className="text-sm font-bold text-slate-700">Environment</span>
              <select name="environment_scope" defaultValue="all" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3">
                <option value="all">Prod + Demo</option>
                <option value="production">Production only</option>
                <option value="demo">Demo only</option>
              </select>
            </label>

            <fieldset className="sm:col-span-2 rounded-2xl border border-slate-200 p-4">
              <legend className="px-1 text-sm font-black text-slate-800">Audience</legend>
              <div className="mt-2 flex flex-wrap gap-4 text-sm font-bold text-slate-700">
                <label className="flex items-center gap-2"><input type="checkbox" name="audience_roles" value="customer" defaultChecked /> Supporters</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="audience_roles" value="business" defaultChecked /> Businesses</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="audience_roles" value="organization" defaultChecked /> Organizations</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="audience_roles" value="owner" /> Owner</label>
              </div>
            </fieldset>

            <label>
              <span className="text-sm font-bold text-slate-700">Primary button</span>
              <input name="cta_label" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Open Website Builder" />
            </label>
            <label>
              <span className="text-sm font-bold text-slate-700">Primary destination</span>
              <input name="cta_url" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="/dashboard/business/website" />
            </label>

            <label>
              <span className="text-sm font-bold text-slate-700">Secondary button</span>
              <input name="secondary_cta_label" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Learn more" />
            </label>
            <label>
              <span className="text-sm font-bold text-slate-700">Secondary destination</span>
              <input name="secondary_cta_url" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="/dashboard/rewards" />
            </label>

            <label className="sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">Image URL (optional)</span>
              <input name="image_url" type="url" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="https://..." />
            </label>

            <label>
              <span className="text-sm font-bold text-slate-700">Starts</span>
              <input name="starts_at" type="datetime-local" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
            </label>
            <label>
              <span className="text-sm font-bold text-slate-700">Ends (optional)</span>
              <input name="ends_at" type="datetime-local" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
            </label>

            <label>
              <span className="text-sm font-bold text-slate-700">Priority</span>
              <input name="priority" type="number" min="1" defaultValue="100" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
              <span className="mt-1 block text-xs text-slate-500">Higher numbers appear first.</span>
            </label>
            <label>
              <span className="text-sm font-bold text-slate-700">Maximum views per user</span>
              <input name="max_views_per_user" type="number" min="1" defaultValue="1" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
            </label>

            <label>
              <span className="text-sm font-bold text-slate-700">Repeat after hours (optional)</span>
              <input name="repeat_after_hours" type="number" min="1" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="24" />
            </label>
            <div className="flex flex-col justify-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-bold text-slate-700">
              <label className="flex items-center gap-2"><input name="dismissible" type="checkbox" defaultChecked /> Allow “Don’t show again”</label>
              <label className="flex items-center gap-2"><input name="is_active" type="checkbox" /> Activate immediately</label>
            </div>

            <button className="sm:col-span-2 min-h-12 rounded-xl bg-slate-950 px-5 font-black text-white hover:bg-slate-800">Create Spotlight</button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Campaigns</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Spotlight history</h2>

          {campaigns.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">No Spotlights created yet.</div>
          ) : (
            <div className="mt-5 space-y-3">
              {campaigns.map((campaign) => {
                const campaignMetrics = metrics.get(campaign.id) ?? { views: 0, clicks: 0, dismissals: 0 }
                return (
                  <article key={campaign.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-black ${campaign.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>{campaign.is_active ? 'Active' : 'Inactive'}</span>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">{campaign.kind.replaceAll('_', ' ')}</span>
                          <span className="text-xs font-bold text-slate-400">Priority {campaign.priority}</span>
                        </div>
                        <h3 className="mt-3 text-lg font-black text-slate-950">{campaign.title}</h3>
                        {campaign.body ? <p className="mt-1 text-sm leading-6 text-slate-600">{campaign.body}</p> : null}
                        <p className="mt-3 text-xs leading-5 text-slate-500">Audience: {campaign.audience_roles.join(', ')} · {campaign.environment_scope} · Starts {formatDate(campaign.starts_at)} · {campaign.ends_at ? `Ends ${formatDate(campaign.ends_at)}` : 'No end date'}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Frequency: up to {campaign.max_views_per_user} view{campaign.max_views_per_user === 1 ? '' : 's'}{campaign.repeat_after_hours ? `, at least ${campaign.repeat_after_hours}h apart` : ''}.</p>
                        {campaign.cta_label && campaign.cta_url ? <p className="mt-1 text-xs font-bold text-blue-700">CTA: {campaign.cta_label} → {campaign.cta_url}</p> : null}
                      </div>
                      <div className="grid min-w-[180px] grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-slate-50 p-2"><p className="text-lg font-black text-slate-950">{campaignMetrics.views}</p><p className="text-[10px] font-bold uppercase text-slate-500">Views</p></div>
                        <div className="rounded-xl bg-blue-50 p-2"><p className="text-lg font-black text-blue-700">{campaignMetrics.clicks}</p><p className="text-[10px] font-bold uppercase text-blue-600">Clicks</p></div>
                        <div className="rounded-xl bg-amber-50 p-2"><p className="text-lg font-black text-amber-700">{campaignMetrics.dismissals}</p><p className="text-[10px] font-bold uppercase text-amber-600">Dismissed</p></div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                      <form action={toggleSpotlightCampaignAction}>
                        <input type="hidden" name="id" value={campaign.id} />
                        <input type="hidden" name="next_active" value={campaign.is_active ? 'false' : 'true'} />
                        <button className={`rounded-lg px-3 py-2 text-xs font-black ${campaign.is_active ? 'bg-slate-100 text-slate-700' : 'bg-green-100 text-green-800'}`}>{campaign.is_active ? 'Pause' : 'Activate'}</button>
                      </form>
                      <form action={deleteSpotlightCampaignAction}>
                        <input type="hidden" name="id" value={campaign.id} />
                        <button className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">Delete</button>
                      </form>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </OwnerWorkspaceShell>
  )
}
