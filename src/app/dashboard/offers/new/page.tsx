'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOfferAction } from '@/app/dashboard/actions'
import {
  deleteBusinessOfferDraftAction,
  getBusinessOfferWizardContextAction,
  saveBusinessOfferDraftAction,
  updateBusinessOfferWizardCategoryAction,
} from '@/app/dashboard/offer-wizard-actions'
import { buildRecommendedOffers } from '@/lib/ai/recommendation-engine'
import { BUSINESS_CATEGORIES } from '@/lib/business-categories'
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
const OFFER_LIMIT_MESSAGE =
  'You have reached the free limit of 3 active offers. Upgrade to add more.'

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDefaultOfferDates() {
  const startsAt = new Date()
  const endsAt = new Date(startsAt)
  endsAt.setFullYear(endsAt.getFullYear() + 1)

  return {
    startsAt: formatLocalDate(startsAt),
    endsAt: formatLocalDate(endsAt),
  }
}

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

function isOfferDraft(value: unknown): value is OfferDraft {
  if (!value || typeof value !== 'object') return false

  const draft = value as Partial<OfferDraft>
  return (
    typeof draft.title === 'string' &&
    typeof draft.memberBenefit === 'string' &&
    typeof draft.qualifyingPurchase === 'string' &&
    typeof draft.description === 'string' &&
    typeof draft.startsAt === 'string' &&
    typeof draft.endsAt === 'string' &&
    typeof draft.limitOnePerMember === 'boolean' &&
    typeof draft.validEveryDay === 'boolean' &&
    typeof draft.requiresPurchase === 'boolean' &&
    typeof draft.exclusivity === 'string' &&
    typeof draft.estimatedRetailValue === 'number' &&
    typeof draft.estimatedBusinessCost === 'number'
  )
}

function isOfferLimitError(message: string) {
  return (
    message === OFFER_LIMIT_MESSAGE ||
    /active offer slots/i.test(message) ||
    /active offers/i.test(message) && /limit|using all/i.test(message)
  )
}

export default function NewOfferPage() {
  const router = useRouter()

  const [checkingProfile, setCheckingProfile] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [step, setStep] = useState(1)
  const [message, setMessage] = useState('')
  const [offerLimitReached, setOfferLimitReached] = useState(false)

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
    let cancelled = false

    async function loadBusinessProfile() {
      const result = await getBusinessOfferWizardContextAction()
      if (cancelled) return

      if (!result.success) {
        if (/logged in/i.test(result.error)) {
          router.replace('/login?next=/dashboard/offers/new')
          return
        }
        setMessage(result.error)
        setCheckingProfile(false)
        return
      }

      const category = result.businessCategory ?? ''
      setBusinessName(result.businessName ?? '')
      setBusinessCategory(category)
      setDraftCategory(category)

      const savedDraft = result.savedDraft as
        | {
            selected_goal?: unknown
            selected_suggestion_id?: unknown
            draft?: unknown
          }
        | null

      if (savedDraft && isOfferDraft(savedDraft.draft)) {
        const goal =
          typeof savedDraft.selected_goal === 'string'
            ? (savedDraft.selected_goal as OfferGoal)
            : null
        setOfferDraft(savedDraft.draft)
        setSelectedGoal(goal)
        setStep(4)
        setMessage('Your saved offer draft has been restored for this business.')

        if (goal && category) {
          const suggestions = buildRecommendedOffers({
            businessCategory: category,
            goal,
          })
          const suggestion = suggestions.find(
            (item) => item.id === savedDraft.selected_suggestion_id
          )
          setSelectedSuggestion(suggestion ?? null)
        }
      }

      setCheckingProfile(false)
    }

    void loadBusinessProfile()
    return () => {
      cancelled = true
    }
  }, [router])

  function handleGoalSelect(goal: OfferGoal) {
    setSelectedGoal(goal)
    setSelectedSuggestion(null)
    setOfferDraft(emptyDraft)
    setMessage('')
    setOfferLimitReached(false)
  }

  function handleSuggestionSelect(suggestion: OfferSuggestion) {
    const { startsAt, endsAt } = getDefaultOfferDates()

    setSelectedSuggestion(suggestion)
    setOfferDraft({
      title: suggestion.title,
      memberBenefit: suggestion.discount,
      qualifyingPurchase: suggestion.requiresPurchase
        ? 'a qualifying purchase'
        : '',
      description: suggestion.description,
      startsAt,
      endsAt,
      limitOnePerMember: true,
      validEveryDay: true,
      requiresPurchase: suggestion.requiresPurchase,
      exclusivity: 'never',
      estimatedRetailValue: suggestion.estimatedRetailValue,
      estimatedBusinessCost: suggestion.estimatedBusinessCost,
    })
    setMessage('')
    setOfferLimitReached(false)
  }

  async function saveBusinessCategory() {
    if (!draftCategory) {
      setMessage('Choose a business type before saving.')
      return
    }

    setSavingCategory(true)
    setMessage('')

    const result = await updateBusinessOfferWizardCategoryAction(draftCategory)
    if (!result.success) {
      setMessage(result.error)
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

  function focusField(selector: string) {
    window.requestAnimationFrame(() => {
      const field = document.querySelector<HTMLElement>(selector)
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      field?.focus({ preventScroll: true })
    })
  }

  function handleContinue() {
    setMessage('')
    setOfferLimitReached(false)

    if (step === 1 && !selectedGoal) {
      setMessage('Choose a business goal before continuing.')
      return
    }

    if (step === 2 && !selectedSuggestion) {
      setMessage('Choose an offer idea before continuing.')
      return
    }

    if (step === 3) {
      if (!offerDraft.title.trim()) {
        setMessage('Add an offer name before continuing.')
        focusField('textarea[placeholder="Example: VIP Lunch Combo"]')
        return
      }

      if (!offerDraft.memberBenefit.trim()) {
        setMessage('Add a member benefit before continuing.')
        focusField('textarea[placeholder="Example: Free loaded fries"]')
        return
      }

      if (!offerDraft.description.trim()) {
        setMessage('Add a customer-facing description before continuing.')
        focusField(
          'textarea[placeholder="Explain why members will enjoy this exclusive offer."]'
        )
        return
      }

      if (
        offerDraft.startsAt &&
        offerDraft.endsAt &&
        offerDraft.endsAt < offerDraft.startsAt
      ) {
        setMessage('The end date must be after the start date.')
        focusField('input[type="date"]:last-of-type')
        return
      }
    }

    setStep((current) => Math.min(current + 1, TOTAL_STEPS))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleBack() {
    setMessage('')
    setOfferLimitReached(false)
    setStep((current) => Math.max(current - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveDraft() {
    const result = await saveBusinessOfferDraftAction({
      selectedGoal,
      selectedSuggestionId: selectedSuggestion?.id ?? null,
      draft: { ...offerDraft },
    })

    return { error: result.success ? null : result.error }
  }

  async function publishOffer() {
    if (publishing) return
    setPublishing(true)
    setMessage('')
    setOfferLimitReached(false)

    const completeDescription = [
      offerDraft.description.trim(),
      offerDraft.requiresPurchase && offerDraft.qualifyingPurchase
        ? `Qualifying purchase: ${offerDraft.qualifyingPurchase.trim()}.`
        : '',
      buildFinePrint(offerDraft),
    ]
      .filter(Boolean)
      .join('\n\n')

    try {
      const result = await createOfferAction({
        title: offerDraft.title.trim(),
        discount: offerDraft.memberBenefit.trim(),
        description: completeDescription,
        starts_at: offerDraft.startsAt || undefined,
        ends_at: offerDraft.endsAt || undefined,
        customer_value: offerDraft.estimatedRetailValue,
      })

      if (result.error) {
        if (isOfferLimitError(result.error)) {
          const saved = await saveDraft()
          if (saved.error) {
            setMessage(
              `${result.error} We could not save your draft: ${saved.error}`
            )
          } else {
            setMessage(
              `${result.error} Your proposed offer was saved to this business workspace so you can manage existing offers without losing it.`
            )
            setOfferLimitReached(true)
          }
          return
        }

        setMessage(result.error)
        return
      }

      await deleteBusinessOfferDraftAction()
      router.replace('/dashboard?offerCreated=true')
    } catch {
      setMessage('An unexpected error occurred. Please try again.')
    } finally {
      setPublishing(false)
    }
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
        <div className="flex justify-end">
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="mt-4">
          <OfferWizardProgress currentStep={step} totalSteps={TOTAL_STEPS} />
        </div>

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
                  {BUSINESS_CATEGORIES.map((category) => (
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
            <div
              role="alert"
              className={`mt-6 rounded-xl p-4 text-sm ${
                offerLimitReached
                  ? 'border border-blue-200 bg-blue-50 text-blue-900'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              <p>{message}</p>
              {offerLimitReached ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/upgrade"
                    className="rounded-xl bg-blue-600 px-5 py-3 text-center font-bold text-white hover:bg-blue-700"
                  >
                    Upgrade Plan
                  </Link>
                  <Link
                    href="/dashboard#business-offers"
                    className="rounded-xl border border-blue-300 bg-white px-5 py-3 text-center font-bold text-blue-700"
                  >
                    Manage Offers
                  </Link>
                </div>
              ) : null}
            </div>
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
