import Link from 'next/link'

import { WorkspaceModule, WorkspaceModuleEmpty } from '@/components/workspace/workspace-module'
import OrganizationAnalyticsSection from './sections/organization-analytics-section'
import OrganizationCampaignsSection from './sections/organization-campaigns-section'
import OrganizationLogoManager from './organization-logo-manager'
import OrganizationPayoutCenter from './organization-payout-center'
import OrganizationPayoutDashboardCard from './organization-payout-dashboard-card'
import OrganizationProfileSetupLoader from './organization-profile-setup-loader'
import OrganizationReportSection from './sections/organization-report-section'
import OrganizationSellerRosterPreview from './organization-seller-roster-preview'
import OrganizationTopSellersSection from './sections/organization-top-sellers-section'
import OrganizationWorkspaceStatus from './organization-workspace-status'

export type OrganizationWorkspaceView = 'dashboard' | 'campaigns' | 'reports'

type SummaryProps = React.ComponentProps<
  typeof import('./sections/organization-summary-section').default
>
type ReportProps = React.ComponentProps<typeof OrganizationReportSection>
type TopSellersProps = React.ComponentProps<typeof OrganizationTopSellersSection>
type CampaignsProps = React.ComponentProps<typeof OrganizationCampaignsSection>
type AnalyticsProps = React.ComponentProps<typeof OrganizationAnalyticsSection>
type SellerRosterCampaigns = React.ComponentProps<
  typeof OrganizationSellerRosterPreview
>['campaigns']

type Props = SummaryProps &
  ReportProps &
  TopSellersProps &
  CampaignsProps &
  AnalyticsProps & {
    sellerCampaigns: SellerRosterCampaigns
    view?: OrganizationWorkspaceView
  }

function campaignStatusLabel(status?: string | null) {
  const value = status?.trim().toLowerCase()
  if (!value) return 'Draft'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default function OrganizationDashboardContent({
  view = 'dashboard',
  ...props
}: Props) {
  const sellerRosterCampaigns = props.campaigns
    .filter((campaign) => {
      const status = campaign.status?.trim().toLowerCase() ?? ''
      return status !== 'completed' && status !== 'archived'
    })
    .map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
    }))

  if (view === 'campaigns') {
    return (
      <div className="mt-5 space-y-5 sm:mt-6 sm:space-y-6">
        <OrganizationWorkspaceStatus>
          <OrganizationProfileSetupLoader statusOnly />
          <OrganizationPayoutDashboardCard />
        </OrganizationWorkspaceStatus>

        {props.organizationId ? (
          <OrganizationLogoManager organizationId={props.organizationId} />
        ) : null}

        <OrganizationPayoutCenter organizationId={props.organizationId} />

        <section id="organization-sellers" className="scroll-mt-24">
          {sellerRosterCampaigns.length > 0 ? (
            <OrganizationSellerRosterPreview campaigns={sellerRosterCampaigns} />
          ) : (
            <WorkspaceModuleEmpty
              title="Create a campaign before adding sellers"
              description="Seller names, referral links, and QR codes are connected to a campaign."
            />
          )}
        </section>

        <OrganizationCampaignsSection
          organizationId={props.organizationId}
          campaigns={props.campaigns}
          metricsByCampaign={props.metricsByCampaign}
          campaignCreationPricing={props.campaignCreationPricing}
        />
      </div>
    )
  }

  if (view === 'reports') {
    return (
      <div className="mt-5 space-y-5 sm:mt-6 sm:space-y-6">
        <WorkspaceModule
          title="Fundraising performance"
          description="Across all campaigns"
          tone="green"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Raised', `$${props.totalFundsRaised.toLocaleString()}`],
              ['Passes', props.totalPassesSold.toLocaleString()],
              ['Supporters', props.totalSupporters.toLocaleString()],
              ['Campaigns', props.totalCampaigns.toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-3 text-center">
                <p className="text-xs font-bold text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </WorkspaceModule>

        <OrganizationAnalyticsSection
          totalCampaigns={props.totalCampaigns}
          activeSellerCount={props.activeSellerCount}
        />
        <OrganizationReportSection
          grossRevenue={props.grossRevenue}
          totalFees={props.totalFees}
          totalEarnings={props.totalEarnings}
          totalPassesSold={props.totalPassesSold}
        />
        <OrganizationTopSellersSection
          campaigns={props.campaigns}
          sellers={props.sellers}
        />

        <Link
          href="/dashboard/campaigns"
          className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
        >
          Manage campaigns
        </Link>
      </div>
    )
  }

  const campaignPreview = props.campaigns.slice(0, 2)
  const recommendedActions = [
    ...(props.activeCampaigns === 0
      ? [{
          title: 'Launch your next fundraiser',
          description: 'Create or finish a campaign so supporters can begin purchasing passes.',
          href: '/dashboard/campaigns',
        }]
      : []),
    ...(props.totalSellers === 0
      ? [{
          title: 'Add sellers to your roster',
          description: 'Give participants referral links and QR codes before your fundraiser launches.',
          href: '/dashboard/campaigns#organization-sellers',
        }]
      : []),
    ...(props.totalSupporters === 0 && props.activeCampaigns > 0
      ? [{
          title: 'Share your active fundraiser',
          description: 'Invite the first supporters and give sellers a clear next step.',
          href: '/dashboard/campaigns',
        }]
      : []),
  ].slice(0, 3)

  return (
    <div className="mt-5 space-y-5 sm:mt-6 sm:space-y-6">
      <WorkspaceModule
        title="Fundraising performance"
        description="Across all campaigns"
        tone="green"
        action={
          <Link href="/dashboard/reports" className="text-sm font-bold text-blue-700">
            View details
          </Link>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Raised', `$${props.totalFundsRaised.toLocaleString()}`],
            ['Passes', props.totalPassesSold.toLocaleString()],
            ['Supporters', props.totalSupporters.toLocaleString()],
            ['Campaigns', props.totalCampaigns.toLocaleString()],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-3 text-center">
              <p className="text-xs font-bold text-slate-500">{label}</p>
              <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
            </div>
          ))}
        </div>
      </WorkspaceModule>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {recommendedActions.length > 0 ? (
          <WorkspaceModule
            title="Recommended actions"
            eyebrow="Needs your attention"
            badge={
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
                {recommendedActions.length} {recommendedActions.length === 1 ? 'item' : 'items'}
              </span>
            }
            tone="rose"
          >
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {recommendedActions.map((action) => (
                <Link key={action.title} href={action.href} className="flex items-center gap-3 p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-black text-white">→</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-slate-950">{action.title}</span>
                    <span className="mt-0.5 block text-sm leading-5 text-slate-500">{action.description}</span>
                  </span>
                  <span className="text-xl text-slate-400">›</span>
                </Link>
              ))}
            </div>
          </WorkspaceModule>
        ) : null}

        <WorkspaceModule
          title="Campaigns"
          description={`${props.activeCampaigns} active · ${props.totalCampaigns} total`}
          tone="blue"
          action={
            <Link href="/dashboard/campaigns" className="text-sm font-bold text-blue-700">
              Manage
            </Link>
          }
          emptyState={
            <WorkspaceModuleEmpty
              title="No campaigns yet"
              description="Create your first fundraiser to get started."
            />
          }
        >
          {campaignPreview.length > 0 ? (
            <div className="space-y-3">
              {campaignPreview.map((campaign) => {
                const metrics = props.metricsByCampaign[campaign.id]
                return (
                  <div key={campaign.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-950">{campaign.name || 'Untitled campaign'}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {metrics?.supporterCount ?? 0} supporters · ${metrics?.amountRaised?.toLocaleString() ?? '0'} raised
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      {campaignStatusLabel(campaign.status)}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : null}
        </WorkspaceModule>
      </div>
    </div>
  )
}
