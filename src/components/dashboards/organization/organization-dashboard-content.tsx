import OrganizationAnalyticsSection from './sections/organization-analytics-section'
import OrganizationCampaignsSection from './sections/organization-campaigns-section'
import OrganizationPayoutCenter from './organization-payout-center'
import OrganizationPayoutDashboardCard from './organization-payout-dashboard-card'
import OrganizationProfileSetupLoader from './organization-profile-setup-loader'
import OrganizationReportSection from './sections/organization-report-section'
import OrganizationSellerRosterPreview from './organization-seller-roster-preview'
import OrganizationSummarySection from './sections/organization-summary-section'
import OrganizationTopSellersSection from './sections/organization-top-sellers-section'
import OrganizationWorkspaceStatus from './organization-workspace-status'

type SummaryProps = React.ComponentProps<typeof OrganizationSummarySection>
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

export default function OrganizationDashboardContent(props: Props) {
  const topSellers = props.sellers.slice(0, 3)
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

  return (
    <div className="mt-8 space-y-8">
      <OrganizationWorkspaceStatus>
        <OrganizationProfileSetupLoader statusOnly />
        <OrganizationPayoutDashboardCard />
      </OrganizationWorkspaceStatus>

      <OrganizationPayoutCenter organizationId={props.organizationId} />

      <OrganizationSummarySection
        activeCampaigns={props.activeCampaigns}
        totalFundsRaised={props.totalFundsRaised}
        totalSellers={props.totalSellers}
        totalSupporters={props.totalSupporters}
      />

      <details className="group rounded-2xl border border-blue-100 bg-white/90 shadow-xl backdrop-blur">
        <summary className="cursor-pointer list-none px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-gray-900">
                Campaign performance
              </p>
              <p className="mt-1 truncate text-sm text-gray-600">
                {props.totalPassesSold.toLocaleString()} passes sold · $
                {props.totalEarnings.toLocaleString()} organization earnings ·{' '}
                {props.totalCampaigns.toLocaleString()} campaigns
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 group-open:hidden">
              View reports
            </span>
            <span className="hidden shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 group-open:inline">
              Hide
            </span>
          </div>

          <div className="mt-3 border-t border-blue-100 pt-3 group-open:hidden">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
              Recent seller leaders
            </p>
            {topSellers.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {topSellers.map((seller) => (
                  <span
                    key={seller.seller}
                    className="inline-flex items-center gap-2"
                  >
                    <span className="font-semibold text-gray-900">
                      {seller.seller}
                    </span>
                    <span className="text-gray-600">{seller.sold} sold</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-600">
                No seller referrals tracked yet.
              </p>
            )}
          </div>
        </summary>

        <div className="space-y-6 border-t border-blue-100 p-5 sm:p-6">
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
        </div>
      </details>

      {sellerRosterCampaigns.length > 0 ? (
        <OrganizationSellerRosterPreview campaigns={sellerRosterCampaigns} />
      ) : (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm sm:p-6">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
            Seller roster setup
          </p>
          <h2 className="mt-2 text-xl font-bold text-gray-900">
            Create a campaign before adding sellers
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-700">
            Seller names, referral links, and QR codes are saved to a specific campaign. Create your first draft campaign below, then return here to build the roster before launch.
          </p>
        </section>
      )}

      <OrganizationCampaignsSection
        organizationId={props.organizationId}
        campaigns={props.campaigns}
        metricsByCampaign={props.metricsByCampaign}
        campaignCreationPricing={props.campaignCreationPricing}
      />
    </div>
  )
}
