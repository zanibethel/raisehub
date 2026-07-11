import QuickActionCard from '@/components/dashboard/quick-action-card'
import SectionHeader from '@/components/dashboard/section-header'

type BusinessDashboardQuickActionsProps = {
  hasReachedLimit: boolean
}

export default function BusinessDashboardQuickActions({
  hasReachedLimit,
}: BusinessDashboardQuickActionsProps) {
  return (
    <section>
      <SectionHeader
        title="Quick Actions"
        description="Manage the most important parts of your Community Partner account."
      />

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <QuickActionCard
          title="Create an Offer"
          description="Build a high-value, RaiseHub-exclusive promotion using tailored recommendations."
          href="/dashboard/offers/new"
          label={
            hasReachedLimit
              ? 'Review Offer Limit'
              : 'Open Offer Wizard'
          }
          tone="green"
        />

        <QuickActionCard
          title="View Public Profile"
          description="See how members and organizations experience your business."
          href="/businesses"
          label="View Businesses"
          tone="blue"
        />

        <QuickActionCard
          title="Review Redemptions"
          description="See which exclusive offers members are using most often."
          href="#my-offers"
          label="View Offer Reports"
          tone="yellow"
        />
      </div>
    </section>
  )
}