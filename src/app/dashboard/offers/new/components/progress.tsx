type OfferWizardProgressProps = {
  currentStep: number
  totalSteps: number
}

const stepLabels = [
  'Choose a goal',
  'Pick an idea',
  'Customize',
  'Review',
]

export default function OfferWizardProgress({
  currentStep,
  totalSteps,
}: OfferWizardProgressProps) {
  const progress = Math.round((currentStep / totalSteps) * 100)

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-blue-700">
            Create an Exclusive Offer
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        <p className="text-sm font-semibold text-green-700">{progress}%</p>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-green-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 hidden grid-cols-4 gap-2 sm:grid">
        {stepLabels.map((label, index) => {
          const stepNumber = index + 1
          const active = stepNumber === currentStep
          const completed = stepNumber < currentStep

          return (
            <div
              key={label}
              className={`rounded-lg px-2 py-2 text-center text-xs font-medium ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : completed
                    ? 'bg-green-50 text-green-700'
                    : 'bg-gray-50 text-gray-400'
              }`}
            >
              {completed ? '✓ ' : ''}
              {label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
