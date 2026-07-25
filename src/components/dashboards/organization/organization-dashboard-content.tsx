import OrganizationAnalyticsSection from './sections/organization-analytics-section'
import OrganizationCampaignsSection from './sections/organization-campaigns-section'
import OrganizationPayoutDashboardCard from './organization-payout-dashboard-card'
import OrganizationProfileSetupLoader from './organization-profile-setup-loader'
import OrganizationReportSection from './sections/organization-report-section'
import OrganizationSummarySection from './sections/organization-summary-section'
import OrganizationTopSellersSection from './sections/organization-top-sellers-section'

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
      <OrganizationProfileSetupLoader />
      <OrganizationPayoutDashboardCard />

      <OrganizationSummarySection
        activeCampaigns={props.activeCampaigns}
        totalFundsRaised={props.totalFundsRaised}
        totalSellers={props.totalSellers}
        totalSupporters={props.totalSupporters}
      />

      <details className="group rounded-2xl border border-blue-100 bg-white/90 shadow-xl backdrop-blur">
        <summary className="cursor-pointer list-none px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-bold text-gray-900">Performance and top sellers</p>
              <p className="mt-1 text-sm text-gray-600">See who is leading now. Expand for fundraising totals and report tools.</p>
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 group-open:hidden">View more</span>
            <span className="hidden shrink-0 rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 group-open:inline">Hide</span>
          </div>

          <div className="mt-5 border-t border-blue-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Top sellers</p>
            {topSellers.length > 0 ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {topSellers.map((seller, index) => (
                  <div key={seller.seller} className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3 sm:block">
                      <div>
                        <p className="font-bold text-gray-900">#{index + 1} {seller.seller}</p>
                        <p className="mt-1 text-xs text-gray-600">{seller.sold} {seller.sold === 1 ? 'pass' : 'passes'} sold</p>
                      </div>
                      <p className="font-bold text-amber-700 sm:mt-2">${seller.earnings.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-600">No seller referrals tracked yet.</p>
            )}
          </div>
        </summary>

        <div className="space-y-6 border-t border-blue-100 p-5 sm:p-6">
          <OrganizationAnalyticsSection totalCampaigns={props.totalCampaigns} activeSellerCount={props.activeSellerCount} />
          <OrganizationReportSection grossRevenue={props.grossRevenue} totalFees={props.totalFees} totalEarnings={props.totalEarnings} totalPassesSold={props.totalPassesSold} />
          {props.sellers.length > 3 ? <OrganizationTopSellersSection sellers={props.sellers} /> : null}
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
