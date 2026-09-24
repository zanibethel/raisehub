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
    <div className="mb-6 border-b border-slate-200 pb-5 sm:rounded-2xl sm:border sm:bg-white sm:p-5 sm:shadow-sm">
      <div className="flex items-center justify-between gap-4 text-sm">
        <div>
          <p className="font-black text-blue-700">Business Setup</p>
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
