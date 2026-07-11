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

// =============================================================================
// Component Props
// =============================================================================

type Props = SummaryProps &
  ReportProps &
  TopSellersProps &
  CampaignsProps

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
      />
    </div>
  )
}