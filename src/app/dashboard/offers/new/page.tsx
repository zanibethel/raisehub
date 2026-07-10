'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createOfferAction } from '@/app/dashboard/actions'
import OfferWizardProgress from './components/progress'
import GoalStep, { type OfferGoal } from './components/goal-step'
import SuggestionStep, {
  type OfferSuggestion,
} from './components/suggestion-step'
import DetailsStep, {
  buildFinePrint,
  type OfferDraft,
} from './components/details-step'
import ReviewStep from './components/review-step'

const TOTAL_STEPS = 4

const businessCategories = [
  'Restaurant / Food',
  'Food Truck',
  'Salon / Beauty',
  'Automotive',
  'Retail / Boutique',
  'Fitness / Wellness',
  'Home Services',
  'Medical / Dental',
  'Entertainment',
  'Pet Services',
  'Professional Services',
  'Mobile Business',
  'Pop-Up / Event Vendor',
  'Other',
]

const emptyDraft: OfferDraft = {
  title: '',
  memberBenefit: '',
  qualifyingPurchase: '',
  description: '',
  startsAt: '',
  endsAt: '',
  limitOnePerMember: true,
  validEveryDay: true,
  requiresPurchase: true,
  exclusivity: 'never',
  estimatedRetailValue: 10,
  estimatedBusinessCost: 3,
}

export default function NewOfferPage() {
  const router = useRouter()
  const supabase = createClient()

  const [checkingProfile, setCheckingProfile] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [step, setStep] = useState(1)
  const [message, setMessage] = useState('')

  const [businessName, setBusinessName] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [draftCategory, setDraftCategory] = useState('')
  const [editingCategory, setEditingCategory] = useState(false)
  const [savingCategory, setSavingCategory] = useState(false)

  const [selectedGoal, setSelectedGoal] = useState<OfferGoal | null>(null)
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<OfferSuggestion | null>(null)
  const [offerDraft, setOfferDraft] = useState<OfferDraft>(emptyDraft)

  useEffect(() => {
    async function loadBusinessProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login?next=/dashboard/offers/new')
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('business_name, business_category, role')
        .eq('id', user.id)
        .single()

      if (error) {
        setMessage('We could not load your business profile.')
        setCheckingProfile(false)
        return
      }

      if (profile?.role !== 'business') {
        router.replace('/dashboard')
        return
      }

      const category = profile.business_category ?? ''

      setBusinessName(profile.business_name ?? '')
      setBusinessCategory(category)
      setDraftCategory(category)
      setCheckingProfile(false)
    }

    loadBusinessProfile()
  }, [router, supabase])

  function handleGoalSelect(goal: OfferGoal) {
    setSelectedGoal(goal)
    setSelectedSuggestion(null)
    setOfferDraft(emptyDraft)
    setMessage('')
  }

  function handleSuggestionSelect(suggestion: OfferSuggestion) {
    setSelectedSuggestion(suggestion)

    setOfferDraft({
      title: suggestion.title,
      memberBenefit: suggestion.discount,
      qualifyingPurchase: suggestion.requiresPurchase
        ? 'a qualifying purchase'
        : '',
      description: suggestion.description,
      startsAt: '',
      endsAt: '',
      limitOnePerMember: true,
      validEveryDay: true,
      requiresPurchase: suggestion.requiresPurchase,
      exclusivity: 'never',
      estimatedRetailValue: suggestion.estimatedRetailValue,
      estimatedBusinessCost: suggestion.estimatedBusinessCost,
    })

    setMessage('')
  }

  async function saveBusinessCategory() {
    if (!draftCategory) {
      setMessage('Choose a business type before saving.')
      return
    }

    setSavingCategory(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.replace('/login?next=/dashboard/offers/new')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ business_category: draftCategory })
      .eq('id', user.id)

    if (error) {
      setMessage(error.message)
      setSavingCategory(false)
      return
    }

    setBusinessCategory(draftCategory)
    setSelectedGoal(null)
    setSelectedSuggestion(null)
    setOfferDraft(emptyDraft)
    setEditingCategory(false)
    setSavingCategory(false)
    setStep(1)
  }

  function handleContinue() {
    setMessage('')

    if (step === 1 && !selectedGoal) {
      setMessage('Choose a business goal before continuing.')
      return
    }

    if (step === 2 && !selectedSuggestion) {
      setMessage('Choose an offer idea before continuing.')
      return
    }

    if (
      step === 3 &&
      (!offerDraft.title.trim() ||
        !offerDraft.memberBenefit.trim() ||
        !offerDraft.description.trim())
    ) {
      setMessage(
        'Add an offer name, member benefit, and description before continuing.'
      )
      return
    }

    if (
      step === 3 &&
      offerDraft.startsAt &&
      offerDraft.endsAt &&
      offerDraft.endsAt < offerDraft.startsAt
    ) {
      setMessage('The end date must be after the start date.')
      return
    }

    setStep((current) => Math.min(current + 1, TOTAL_STEPS))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleBack() {
    setMessage('')
    setStep((current) => Math.max(current - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function publishOffer() {
    setPublishing(true)
    setMessage('')

    const completeDescription = [
      offerDraft.description.trim(),
      offerDraft.requiresPurchase && offerDraft.qualifyingPurchase
        ? `Qualifying purchase: ${offerDraft.qualifyingPurchase.trim()}.`
        : '',
      buildFinePrint(offerDraft),
    ]
      .filter(Boolean)
      .join('\n\n')

    const result = await createOfferAction({
      title: offerDraft.title.trim(),
      discount: offerDraft.memberBenefit.trim(),
      description: completeDescription,
      starts_at: offerDraft.startsAt || undefined,
      ends_at: offerDraft.endsAt || undefined,
    })

    if (result.error) {
      setMessage(result.error)
      setPublishing(false)
      return
    }

    router.push('/dashboard?offerCreated=true')
    router.refresh()
  }

  if (checkingProfile) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-100 via-slate-50 to-green-50 px-5 py-16">
        <section className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-xl">
          <p className="font-semibold text-blue-700">
            Preparing your offer recommendations...
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-100 via-slate-50 to-green-50 px-5 py-10 text-gray-900 sm:px-8 sm:py-16">
      <section className="mx-auto max-w-5xl">
        <OfferWizardProgress
          currentStep={step}
          totalSteps={TOTAL_STEPS}
        />

        <div className="mt-6 rounded-3xl border border-white/70 bg-white/95 p-6 shadow-xl sm:p-9">
          <div className="mb-7 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            {editingCategory ? (
              <div>
                <p className="text-sm font-bold text-blue-800">
                  Change business type
                </p>

                <select
                  value={draftCategory}
                  onChange={(event) => setDraftCategory(event.target.value)}
                  className="mt-3 w-full rounded-xl border border-blue-200 bg-white p-3"
                >
                  <option value="">Select a business type</option>

                  {businessCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={saveBusinessCategory}
                    disabled={savingCategory}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {savingCategory ? 'Saving...' : 'Save Business Type'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingCategory(false)}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    Current business type
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {businessCategory || 'Not selected'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDraftCategory(businessCategory)
                    setEditingCategory(true)
                  }}
                  className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700"
                >
                  Change Business Type
                </button>
              </div>
            )}
          </div>

          {step === 1 ? (
            <GoalStep
              selectedGoal={selectedGoal}
              onSelect={handleGoalSelect}
              businessCategory={businessCategory}
            />
          ) : null}

          {step === 2 && selectedGoal ? (
            <SuggestionStep
              businessName={businessName}
              businessCategory={businessCategory}
              selectedGoal={selectedGoal}
              selectedSuggestion={selectedSuggestion}
              onSelect={handleSuggestionSelect}
            />
          ) : null}

          {step === 3 ? (
            <DetailsStep
              businessName={businessName}
              draft={offerDraft}
              onChange={setOfferDraft}
            />
          ) : null}

          {step === 4 ? (
            <ReviewStep
              businessName={businessName}
              draft={offerDraft}
              publishing={publishing}
              onPublish={publishOffer}
            />
          ) : null}

          {message ? (
            <p className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {message}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={publishing}
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 disabled:opacity-50"
              >
                Back
              </button>
            ) : (
              <span />
            )}

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={handleContinue}
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-blue-700"
              >
                Continue
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  )
}
