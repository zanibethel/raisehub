export type OfferGoal =
  | 'new-customers'
  | 'repeat-customers'
  | 'slow-day'
  | 'new-product'
  | 'average-purchase'
  | 'appointments'
  | 'event-traffic'

type GoalOption = {
  value: OfferGoal
  title: string
  description: string
  bestFor: string
}

type GoalStepProps = {
  selectedGoal: OfferGoal | null
  onSelect: (goal: OfferGoal) => void
  businessCategory?: string
}

const goals: GoalOption[] = [
  {
    value: 'new-customers',
    title: 'Attract New Customers',
    description:
      'Give first-time visitors a strong reason to try your business.',
    bestFor: 'First-visit discounts and welcome offers',
  },
  {
    value: 'repeat-customers',
    title: 'Bring Customers Back',
    description:
      'Encourage previous customers to return sooner or visit more often.',
    bestFor: 'Loyalty rewards and return-visit offers',
  },
  {
    value: 'slow-day',
    title: 'Increase Slow-Day Traffic',
    description:
      'Create demand during quieter days, hours, or service periods.',
    bestFor: 'Midweek, lunch-hour, and limited-time offers',
  },
  {
    value: 'new-product',
    title: 'Promote a Product or Service',
    description:
      'Introduce customers to something new or underused.',
    bestFor: 'New menu items, services, packages, and upgrades',
  },
  {
    value: 'average-purchase',
    title: 'Increase Average Purchase',
    description:
      'Encourage customers to add more items or choose a larger package.',
    bestFor: 'Bundles, minimum-purchase discounts, and free add-ons',
  },
  {
    value: 'appointments',
    title: 'Fill Open Appointments',
    description:
      'Use targeted promotions to fill cancellations or open service times.',
    bestFor: 'Salons, wellness providers, and appointment businesses',
  },
  {
    value: 'event-traffic',
    title: 'Boost Event or Location Traffic',
    description:
      'Bring customers to a food-truck stop, pop-up, festival, or event.',
    bestFor: 'Food trucks, mobile businesses, and event vendors',
  },
]

export default function GoalStep({
  selectedGoal,
  onSelect,
  businessCategory,
}: GoalStepProps) {
  const isFoodTruck =
    businessCategory?.toLowerCase().includes('food truck') ?? false

  const orderedGoals = isFoodTruck
    ? [
        goals.find((goal) => goal.value === 'event-traffic')!,
        goals.find((goal) => goal.value === 'new-customers')!,
        goals.find((goal) => goal.value === 'slow-day')!,
        ...goals.filter(
          (goal) =>
            !['event-traffic', 'new-customers', 'slow-day'].includes(goal.value)
        ),
      ]
    : goals

  return (
    <div>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">
        Start with your goal
      </p>

      <h1 className="mt-3 text-3xl font-bold text-blue-700 sm:text-4xl">
        What would you like this offer to accomplish?
      </h1>

      <p className="mt-4 max-w-2xl leading-7 text-gray-600">
        RaiseHub will use your goal and business category to recommend
        promotions that fit your business.
      </p>

      {businessCategory ? (
        <div className="mt-5 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
          Suggestions tailored for: {businessCategory}
        </div>
      ) : null}

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {orderedGoals.map((goal) => {
          const selected = selectedGoal === goal.value

          return (
            <button
              key={goal.value}
              type="button"
              onClick={() => onSelect(goal.value)}
              className={`rounded-2xl border p-5 text-left transition ${
                selected
                  ? 'border-green-500 bg-green-50 ring-2 ring-green-100'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-bold text-gray-900">
                  {selected ? '✓ ' : ''}
                  {goal.title}
                </h2>

                {goal.value === 'event-traffic' && isFoodTruck ? (
                  <span className="rounded-full bg-yellow-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-yellow-800">
                    Recommended
                  </span>
                ) : null}
              </div>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                {goal.description}
              </p>

              <p className="mt-4 text-xs font-semibold text-blue-600">
                Best for: {goal.bestFor}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
