import OrganizationReportToggle from '@/app/components/organization-report-toggle'

// =============================================================================
// Types
// =============================================================================

type OrganizationReportSectionProps = {
  grossRevenue: number
  totalFees: number
  totalEarnings: number
  totalPassesSold: number
}

// =============================================================================
// Component
// =============================================================================

export default function OrganizationReportSection({
  grossRevenue,
  totalFees,
  totalEarnings,
  totalPassesSold,
}: OrganizationReportSectionProps) {
  return (
    <OrganizationReportToggle
      grossRevenue={grossRevenue}
      totalFees={totalFees}
      totalEarnings={totalEarnings}
      totalPassesSold={totalPassesSold}
    />
  )
}