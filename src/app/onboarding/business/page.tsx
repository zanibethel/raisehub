'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TOTAL_STEPS = 5

const businessCategories = [
  'Restaurant / Food',
  'Salon / Beauty',
  'Automotive',
  'Retail / Boutique',
  'Fitness / Wellness',
  'Home Services',
  'Medical / Dental',
  'Entertainment',
  'Pet Services',
  'Professional Services',
  'Other',
]

const posProviders = [
  'Square',
  'Clover',
  'Toast',
  'Shopify POS',
  'Stripe Terminal',
  'Other',
  'No POS / Cash Register',
]

const redemptionMethods = [
  {
    value: 'qr',
    title: 'QR Code',
    description: 'Staff scan or verify a unique RaiseHub redemption code.',
  },
  {
    value: 'cashier',
    title: 'Cashier Verification',
    description: 'A staff member confirms the offer inside the business dashboard.',
  },
  {
    value: 'manual',
    title: 'Manual Redemption',
    description: 'Use a simple confirmation button while native POS support is added.',
  },
]

export default function BusinessOnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [businessName, setBusinessName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [facebookUrl, setFacebookUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [posProvider, setPosProvider] = useState('')
  const [redemptionMethod, setRedemptionMethod] = useState('qr')

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login?next=/onboarding/business')
        return
      }

const { data: profile } = await supabase
  .from('profiles')
  .select(`
    business_name,
    business_category,
    business_description,
    phone,
    address,
    website_url,
    google_maps_url,
    facebook_url,
    instagram_url,
    tiktok_url,
    pos_provider,
    redemption_method
  `)
  .eq('id', user.id)
  .single()

      if (profile) {
        setBusinessName(profile.business_name ?? '')
        setCategory(profile.business_category ?? '')
        setDescription(profile.business_description ?? '')
        setPhone(profile.phone ?? '')
        setAddress(profile.address ?? '')
        setWebsiteUrl(profile.website_url ?? '')
        setGoogleMapsUrl(profile.google_maps_url ?? '')
        setFacebookUrl(profile.facebook_url ?? '')
        setInstagramUrl(profile.instagram_url ?? '')
        setTiktokUrl(profile.tiktok_url ?? '')
        setPosProvider(profile.pos_provider ?? '')
        setRedemptionMethod(profile.redemption_method ?? 'qr')
      }

      setCheckingAuth(false)
    }

    loadProfile()
  }, [router, supabase])

  function nextStep() {
    setMessage('')

    if (step === 2 && (!businessName.trim() || !category)) {
      setMessage('Add your business name and category before continuing.')
      return
    }

    if (step === 4 && !posProvider) {
      setMessage('Choose your current checkout system before continuing.')
      return
    }

    setStep((current) => Math.min(current + 1, TOTAL_STEPS))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function previousStep() {
    setMessage('')
    setStep((current) => Math.max(current - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function completeOnboarding() {
    setSaving(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.replace('/login?next=/onboarding/business')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        role: 'business',
        business_name: businessName.trim(),
        business_category: category,
        business_description: description.trim(),
        phone: phone.trim(),
        address: address.trim(),
        website_url: websiteUrl.trim(),
        google_maps_url: googleMapsUrl.trim(),
        facebook_url: facebookUrl.trim(),
        instagram_url: instagramUrl.trim(),
        tiktok_url: tiktokUrl.trim(),
        pos_provider: posProvider,
        redemption_method: redemptionMethod,
        onboarding_completed: true,
      })
      .eq('id', user.id)

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-100 via-slate-50 to-green-50 px-5 py-16">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-xl">
          <p className="text-gray-600">Loading your business setup...</p>
        </div>
      </main>
    )
  }

  const progress = (step / TOTAL_STEPS) * 100

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-100 via-slate-50 to-green-50 px-5 py-10 text-gray-900 sm:px-8 sm:py-16">
      <section className="mx-auto max-w-3xl">
        <div className="mb-6 rounded-2xl border border-white/70 bg-white/85 p-5 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between gap-4 text-sm">
            <div>
              <p className="font-semibold text-blue-700">Business Setup</p>
              <p className="mt-1 text-gray-500">
                Step {step} of {TOTAL_STEPS}
              </p>
            </div>

            <p className="text-right text-xs text-gray-500">
              About {Math.max(TOTAL_STEPS - step + 1, 1)} minutes remaining
            </p>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-green-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/95 p-6 shadow-xl sm:p-9">
          {step === 1 ? (
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">
                Welcome, Community Partner
              </p>

              <h1 className="mt-4 text-3xl font-bold text-blue-700 sm:text-4xl">
                Let’s build your RaiseHub profile
              </h1>

              <p className="mx-auto mt-5 max-w-xl leading-7 text-gray-600">
                You’ll add your business information, select how customers
                redeem offers, and tell us which checkout system you currently
                use.
              </p>

              <div className="mx-auto mt-8 max-w-lg rounded-2xl bg-green-50 p-6 text-left">
                <p className="font-semibold text-green-800">
                  Your free Community Partner account includes:
                </p>

                <ul className="mt-4 space-y-3 text-sm text-gray-700">
                  <li>✓ A public business profile</li>
                  <li>✓ Up to 3 active exclusive offers</li>
                  <li>✓ Support for local organizations</li>
                  <li>✓ Basic redemption and impact tracking</li>
                </ul>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">
                Business basics
              </p>

              <h1 className="mt-3 text-3xl font-bold text-blue-700">
                Tell customers about your business
              </h1>

              <div className="mt-7 space-y-5">
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">
                    Business name
                  </span>
                  <input
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500"
                    placeholder="Example: Elysian Hair Salon"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">
                    Category
                  </span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-blue-500"
                  >
                    <option value="">Select a category</option>
                    {businessCategories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">
                    Business description
                  </span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={5}
                    className="mt-2 w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500"
                    placeholder="What makes your business special?"
                  />
                </label>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">
                Contact and social presence
              </p>

              <h1 className="mt-3 text-3xl font-bold text-blue-700">
                Help customers find and follow you
              </h1>

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                {[
                  ['Phone number', phone, setPhone, '806-555-0123'],
                  ['Address', address, setAddress, 'Business address'],
                  ['Website', websiteUrl, setWebsiteUrl, 'https://...'],
                  ['Google Maps link', googleMapsUrl, setGoogleMapsUrl, 'https://maps...'],
                  ['Facebook', facebookUrl, setFacebookUrl, 'Facebook page URL'],
                  ['Instagram', instagramUrl, setInstagramUrl, 'Instagram URL'],
                  ['TikTok', tiktokUrl, setTiktokUrl, 'TikTok URL'],
                ].map(([label, value, setter, placeholder]) => (
                  <label className="block" key={label as string}>
                    <span className="text-sm font-semibold text-gray-700">
                      {label as string}
                    </span>
                    <input
                      value={value as string}
                      onChange={(event) =>
                        (setter as (value: string) => void)(event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-blue-500"
                      placeholder={placeholder as string}
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">
                Checkout and redemption
              </p>

              <h1 className="mt-3 text-3xl font-bold text-blue-700">
                Keep the system you already use
              </h1>

              <p className="mt-4 leading-7 text-gray-600">
                Select your current checkout system. RaiseHub will provide QR or
                manual redemption now, with deeper integrations added where
                supported.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {posProviders.map((provider) => (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => setPosProvider(provider)}
                    className={`rounded-xl border p-4 text-left font-semibold transition ${
                      posProvider === provider
                        ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-100'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {provider}
                  </button>
                ))}
              </div>

              <h2 className="mt-9 text-xl font-bold text-gray-900">
                How should customers redeem offers?
              </h2>

              <div className="mt-4 space-y-3">
                {redemptionMethods.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setRedemptionMethod(method.value)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      redemptionMethod === method.value
                        ? 'border-green-600 bg-green-50 ring-2 ring-green-100'
                        : 'border-gray-200 bg-white hover:border-green-300'
                    }`}
                  >
                    <p className="font-semibold text-gray-900">{method.title}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {method.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 5 ? (
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">
                Review and finish
              </p>

              <h1 className="mt-3 text-3xl font-bold text-blue-700">
                Your Community Partner profile is ready
              </h1>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-blue-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    Business
                  </p>
                  <p className="mt-2 font-bold text-gray-900">
                    {businessName || 'Not provided'}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {category || 'No category selected'}
                  </p>
                </div>

                <div className="rounded-2xl bg-green-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                    Checkout
                  </p>
                  <p className="mt-2 font-bold text-gray-900">
                    {posProvider || 'Not selected'}
                  </p>
                  <p className="mt-1 text-sm capitalize text-gray-600">
                    {redemptionMethod} redemption
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
                <p className="font-semibold text-yellow-900">
                  Next: create your first exclusive offer
                </p>
                <p className="mt-2 text-sm leading-6 text-yellow-800">
                  After saving your profile, you’ll continue to your dashboard.
                  We’ll connect first-offer creation directly to onboarding in
                  the next step.
                </p>
              </div>
            </div>
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
                onClick={previousStep}
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
            ) : (
              <span />
            )}

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={nextStep}
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-blue-700"
              >
                {step === 1 ? 'Let’s Get Started' : 'Continue'}
              </button>
            ) : (
              <button
                type="button"
                onClick={completeOnboarding}
                disabled={saving}
                className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Saving Profile...' : 'Complete Business Setup'}
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
