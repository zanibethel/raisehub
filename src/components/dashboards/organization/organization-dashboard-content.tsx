import OrganizationAnalyticsSection from './sections/organization-analytics-section'
import OrganizationCampaignsSection from './sections/organization-campaigns-section'
import OrganizationProfileSetupSection from './sections/organization-profile-setup-section'
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

type ProfileSetupProps = React.ComponentProps<
  typeof OrganizationProfileSetupSection
>

// =============================================================================
// Component Props
// =============================================================================

type Props = SummaryProps &
  ReportProps &
  TopSellersProps &
  CampaignsProps &
  AnalyticsProps &
  ProfileSetupProps

// =============================================================================
// Component
// =============================================================================

export default function OrganizationDashboardContent(
  props: Props
) {
  return (
    <div className="mt-8 space-y-8">
      <OrganizationProfileSetupSection
        profile={props.profile}
        isComplete={props.isComplete}
      />

      {props.isComplete ? (
        <>
          <OrganizationSummarySection
            activeCampaigns={props.activeCampaigns}
            totalFundsRaised={props.totalFundsRaised}
            totalSellers={props.totalSellers}
            totalSupporters={props.totalSupporters}
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
            campaignCreationPricing={
              props.campaignCreationPricing
            }
          />
        </>
      ) : (
        <section className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6 text-sm leading-6 text-blue-900">
          <h2 className="text-lg font-bold">Your next step</h2>
          <p className="mt-2">
            Save your organization name, town, and state above. RaiseHub will then
            unlock campaign creation, apply the correct managed pricing, and show
            your fundraising tools.
          </p>
        </section>
      )}
    </div>
  )
}
