import OrganizationAnalyticsSection from './sections/organization-analytics-section'
import OrganizationCampaignsSection from './sections/organization-campaigns-section'
import OrganizationReportSection from './sections/organization-report-section'
import OrganizationSummarySection from './sections/organization-summary-section'
import OrganizationTopSellersSection from './sections/organization-top-sellers-section'

// =============================================================================
// Infer section prop types
// =============================================================================

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

// =============================================================================
// Component Props
// =============================================================================

type Props = SummaryProps &
  ReportProps &
  TopSellersProps &
  CampaignsProps &
  AnalyticsProps

// =============================================================================
// Component
// =============================================================================

export default function OrganizationDashboardContent(
  props: Props
) {
  return (
    <div className="mt-8 space-y-8">
      <OrganizationSummarySection
        totalPassesSold={props.totalPassesSold}
        totalEarnings={props.totalEarnings}
        activeCampaigns={props.activeCampaigns}
        totalGoal={props.totalGoal}
      />

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

      <OrganizationCampaignsSection
        campaigns={props.campaigns}
        metricsByCampaign={props.metricsByCampaign}
      />
    </div>
  )
}