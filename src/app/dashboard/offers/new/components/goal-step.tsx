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
    description: 'Welcome and first-visit offers',
  },
  {
    value: 'repeat-customers',
    title: 'Bring Customers Back',
    description: 'Loyalty and return-visit offers',
  },
  {
    value: 'slow-day',
    title: 'Increase Slow-Day Traffic',
    description: 'Quieter days and limited-time offers',
  },
  {
    value: 'new-product',
    title: 'Promote Something New',
    description: 'Products, services, packages, or upgrades',
  },
  {
    value: 'average-purchase',
    title: 'Increase Purchase Size',
    description: 'Bundles, add-ons, and minimum purchases',
  },
  {
    value: 'appointments',
    title: 'Fill Open Appointments',
    description: 'Open times and last-minute availability',
  },
  {
    value: 'event-traffic',
    title: 'Boost Event Traffic',
    description: 'Pop-ups, festivals, stops, and events',
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

      <h1 className="mt-2 text-2xl font-bold text-blue-700 sm:text-4xl">
        What should this offer accomplish?
      </h1>

      <p className="mt-3 text-sm leading-6 text-gray-600 sm:max-w-2xl sm:text-base">
        Choose one goal. RaiseHub will recommend offers you can customize next.
      </p>

      {businessCategory ? (
        <p className="mt-3 text-xs font-semibold text-blue-700">
          Tailored for {businessCategory}
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3">
        {orderedGoals.map((goal, index) => {
          const selected = selectedGoal === goal.value
          const isLastOddCard =
            orderedGoals.length % 2 === 1 && index === orderedGoals.length - 1

          return (
            <button
              key={goal.value}
              type="button"
              onClick={() => onSelect(goal.value)}
              aria-pressed={selected}
              className={`min-h-32 rounded-2xl border p-3 text-left transition sm:min-h-36 sm:p-5 ${
                isLastOddCard ? 'col-span-2 sm:col-span-1' : ''
              } ${
                selected
                  ? 'border-green-500 bg-green-50 ring-2 ring-green-100'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-bold leading-5 text-gray-900 sm:text-base">
                  {selected ? '✓ ' : ''}
                  {goal.title}
                </h2>

                {goal.value === 'event-traffic' && isFoodTruck ? (
                  <span className="shrink-0 rounded-full bg-yellow-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-yellow-800">
                    Best fit
                  </span>
                ) : null}
              </div>

              <p className="mt-2 text-xs leading-5 text-gray-600 sm:text-sm">
                {goal.description}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
