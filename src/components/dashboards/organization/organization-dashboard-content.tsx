import OrganizationAnalyticsSection from './sections/organization-analytics-section'
import OrganizationCampaignsSection from './sections/organization-campaigns-section'
import OrganizationPayoutDashboardCard from './organization-payout-dashboard-card'
import OrganizationProfileSetupLoader from './organization-profile-setup-loader'
import OrganizationReportSection from './sections/organization-report-section'
import OrganizationSummarySection from './sections/organization-summary-section'
import OrganizationTopSellersSection from './sections/organization-top-sellers-section'

type SummaryProps = React.ComponentProps<
  typeof OrganizationSummarySection
>

type ReportProps = React.ComponentProps<
  typeof OrganizationReportSection
>

type TopSellersProps = React.ComponentProps<
  typeof OrganizationTopSellersSection
>

type CampaignsProps = React.ComponentProps<
  typeof OrganizationCampaignsSection
>

type AnalyticsProps = React.ComponentProps<
  typeof OrganizationAnalyticsSection
>

type Props = SummaryProps &
  ReportProps &
  TopSellersProps &
  CampaignsProps &
  AnalyticsProps

export default function OrganizationDashboardContent(
  props: Props
) {
  return (
    <div className="mt-8 space-y-8">
      <OrganizationProfileSetupLoader />

      <OrganizationPayoutDashboardCard />

      <OrganizationCampaignsSection
        campaigns={props.campaigns}
        metricsByCampaign={props.metricsByCampaign}
        campaignCreationPricing={
          props.campaignCreationPricing
        }
      />

      <OrganizationSummarySection
        activeCampaigns={props.activeCampaigns}
        totalFundsRaised={props.totalFundsRaised}
        totalSellers={props.totalSellers}
        totalSupporters={props.totalSupporters}
      />

      <details className="group rounded-2xl border border-blue-100 bg-white/90 shadow-xl backdrop-blur">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-lg font-bold text-gray-900">
              Performance and analytics
            </p>
            <p className="mt-1 text-sm text-gray-600">
              View campaign totals, revenue reporting, and top seller activity.
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 group-open:hidden">
            View
          </span>
          <span className="hidden shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 group-open:inline">
            Hide
          </span>
        </summary>

        <div className="space-y-8 border-t border-blue-100 p-6">
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
            sellers={props.sellers}
          />
        </div>
      </details>
    </div>
  )
}
