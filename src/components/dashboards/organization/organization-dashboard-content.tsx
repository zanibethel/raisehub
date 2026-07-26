import OrganizationAnalyticsSection from './sections/organization-analytics-section'
import OrganizationCampaignsSection from './sections/organization-campaigns-section'
import OrganizationPayoutCenter from './organization-payout-center'
import OrganizationProfileSetupLoader from './organization-profile-setup-loader'
import OrganizationReportSection from './sections/organization-report-section'
import OrganizationSummarySection from './sections/organization-summary-section'
import OrganizationTopSellersSection from './sections/organization-top-sellers-section'
import OrganizationWorkspaceStatus from './organization-workspace-status'

type SummaryProps = React.ComponentProps<typeof OrganizationSummarySection>
type ReportProps = React.ComponentProps<typeof OrganizationReportSection>
type TopSellersProps = React.ComponentProps<typeof OrganizationTopSellersSection>
type CampaignsProps = React.ComponentProps<typeof OrganizationCampaignsSection>
type AnalyticsProps = React.ComponentProps<typeof OrganizationAnalyticsSection>

type Props = SummaryProps & ReportProps & TopSellersProps & CampaignsProps & AnalyticsProps

export default function OrganizationDashboardContent(props: Props) {
  const topSellers = props.sellers.slice(0, 3)

  return (
    <div className="mt-8 space-y-8">
      <OrganizationWorkspaceStatus>
        <OrganizationProfileSetupLoader />
        <OrganizationPayoutCenter organizationId={props.organizationId} />
      </OrganizationWorkspaceStatus>

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
              <p className="text-lg font-bold text-gray-900">Performance and top sellers</p>
              <p className="mt-1 truncate text-sm text-gray-600">
                {props.totalPassesSold.toLocaleString()} passes sold · ${props.totalEarnings.toLocaleString()} organization earnings · {props.activeSellerCount.toLocaleString()} active sellers
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 group-open:hidden">View more</span>
            <span className="hidden shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 group-open:inline">Hide</span>
          </div>

          <div className="mt-3 border-t border-blue-100 pt-3 group-open:hidden">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Top sellers</p>
            {topSellers.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {topSellers.map((seller) => (
                  <span key={seller.seller} className="inline-flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{seller.seller}</span>
                    <span className="text-gray-600">{seller.sold} sold</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-600">No seller referrals tracked yet.</p>
            )}
          </div>
        </summary>

        <div className="space-y-6 border-t border-blue-100 p-5 sm:p-6">
          <OrganizationAnalyticsSection totalCampaigns={props.totalCampaigns} activeSellerCount={props.activeSellerCount} />
          <OrganizationReportSection grossRevenue={props.grossRevenue} totalFees={props.totalFees} totalEarnings={props.totalEarnings} totalPassesSold={props.totalPassesSold} />
          <OrganizationTopSellersSection sellers={props.sellers} />
        </div>
      </details>

      <OrganizationCampaignsSection
        organizationId={props.organizationId}
        campaigns={props.campaigns}
        metricsByCampaign={props.metricsByCampaign}
        campaignCreationPricing={props.campaignCreationPricing}
      />
    </div>
  )
}
