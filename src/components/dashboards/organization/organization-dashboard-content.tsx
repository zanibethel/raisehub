import Link from 'next/link'

import {
  WorkspaceMetricStrip,
  WorkspaceRecommendedActions,
} from '@/components/workspace/workspace-shell'
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
  }

function campaignStatusLabel(status?: string | null) {
  const value = status?.trim().toLowerCase()
  if (!value) return 'Draft'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default function OrganizationDashboardContent(props: Props) {
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

  const campaignPreview = props.campaigns.slice(0, 2)
  const recommendedActions = [
    ...(props.activeCampaigns === 0
      ? [
          {
            id: 'launch-campaign',
            title: 'Launch your next fundraiser',
            description: 'Create or finish a campaign so supporters can begin purchasing passes.',
            href: '#organization-campaigns',
            label: 'Campaign setup',
            tone: 'blue' as const,
          },
        ]
      : []),
    ...(props.totalSellers === 0
      ? [
          {
            id: 'add-sellers',
            title: 'Add sellers to your roster',
            description: 'Give participants referral links and QR codes before your fundraiser launches.',
            href: '#organization-sellers',
            label: 'Seller roster',
            tone: 'green' as const,
          },
        ]
      : []),
    ...(props.totalSupporters === 0 && props.activeCampaigns > 0
      ? [
          {
            id: 'share-campaign',
            title: 'Share your active fundraiser',
            description: 'Invite the first supporters and give sellers a clear next step.',
            href: '#organization-campaigns',
            label: 'Build momentum',
            tone: 'amber' as const,
          },
        ]
      : []),
  ].slice(0, 3)

  return (
    <div className="mt-5 space-y-5 sm:mt-6 sm:space-y-6">
      <WorkspaceMetricStrip
        title="Fundraising performance"
        rangeLabel="all campaigns"
        metrics={[
          { label: 'Raised', value: `$${props.totalFundsRaised.toLocaleString()}`, tone: 'green' },
          { label: 'Passes', value: props.totalPassesSold.toLocaleString(), tone: 'blue' },
          { label: 'Supporters', value: props.totalSupporters.toLocaleString(), tone: 'amber' },
        ]}
        action={
          <Link href="#organization-tools" className="text-sm font-bold text-blue-700">
            View details →
          </Link>
        }
      />

      <WorkspaceRecommendedActions actions={recommendedActions} />

      <section
        id="organization-campaigns"
        className="rounded-[1.75rem] border border-slate-200 bg-white/95 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] sm:p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">Campaigns</h2>
            <p className="mt-1 text-sm text-slate-500">
              {props.activeCampaigns} active · {props.totalCampaigns} total
            </p>
          </div>
          <Link href="#organization-tools" className="text-sm font-bold text-blue-700">
            Manage
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {campaignPreview.length > 0 ? (
            campaignPreview.map((campaign) => {
              const metrics = props.metricsByCampaign[campaign.id]
              return (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-950">
                      {campaign.name || 'Untitled campaign'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {metrics?.supporterCount ?? 0} supporters · ${
                        metrics?.amountRaised?.toLocaleString() ?? '0'
                      } raised
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {campaignStatusLabel(campaign.status)}
                  </span>
                </div>
              )
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center">
              <p className="font-bold text-slate-900">No campaigns yet</p>
              <p className="mt-1 text-sm text-slate-500">Create your first fundraiser to get started.</p>
            </div>
          )}
        </div>
      </section>

      <details
        id="organization-tools"
        className="group rounded-[1.75rem] border border-slate-200 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
      >
        <summary className="cursor-pointer list-none px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-black text-slate-950">Open full organization tools</p>
              <p className="mt-1 text-sm text-slate-500">
                Profile, payouts, sellers, reports, and campaign management
              </p>
            </div>
            <span className="text-2xl text-slate-400 group-open:rotate-90">›</span>
          </div>
        </summary>

        <div className="space-y-6 border-t border-slate-200 p-5 sm:p-6">
          <OrganizationWorkspaceStatus>
            <OrganizationProfileSetupLoader statusOnly />
            <OrganizationPayoutDashboardCard />
          </OrganizationWorkspaceStatus>

          {props.organizationId ? (
            <OrganizationLogoManager organizationId={props.organizationId} />
          ) : null}

          <OrganizationPayoutCenter organizationId={props.organizationId} />

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

          <section id="organization-sellers" className="scroll-mt-24">
            {sellerRosterCampaigns.length > 0 ? (
              <OrganizationSellerRosterPreview campaigns={sellerRosterCampaigns} />
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5">
                <p className="font-bold text-slate-900">Create a campaign before adding sellers</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Seller names, referral links, and QR codes are connected to a campaign.
                </p>
              </div>
            )}
          </section>

          <OrganizationCampaignsSection
            organizationId={props.organizationId}
            campaigns={props.campaigns}
            metricsByCampaign={props.metricsByCampaign}
            campaignCreationPricing={props.campaignCreationPricing}
          />
        </div>
      </details>
    </div>
  )
}
