type OnboardingProgressProps = {
  currentStep: number
  totalSteps: number
}

export default function OnboardingProgress({
  currentStep,
  totalSteps,
}: OnboardingProgressProps) {
  const progress = (currentStep / totalSteps) * 100
  const remainingMinutes = Math.max(totalSteps - currentStep + 1, 1)

  return (
    <div className="mb-6 rounded-2xl border border-white/70 bg-white/85 p-5 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between gap-4 text-sm">
        <div>
          <p className="font-semibold text-blue-700">Business Setup</p>
          <p className="mt-1 text-gray-500">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        <p className="text-right text-xs text-gray-500">
          About {remainingMinutes} minute
          {remainingMinutes === 1 ? '' : 's'} remaining
        </p>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-green-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
