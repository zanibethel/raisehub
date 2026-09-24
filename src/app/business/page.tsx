import Link from 'next/link'

const freeFeatures = [
  'Public business profile and community partner presence',
  'Up to 3 active offers',
  'Participation in local fundraising',
  'Basic offer and redemption tracking',
  'QR or manual coupon redemption',
]

const growthFeatures = [
  'More than 3 active offers',
  'Growth-tier placement and promotion eligibility',
  'Advanced analytics and future paid marketing tools',
  'Additional growth capabilities as they launch',
  'Secure subscription management through Stripe',
]

const steps = [
  {
    number: '01',
    title: 'Create your profile',
    description: 'Tell supporters who you are, what you offer, and how to find you.',
  },
  {
    number: '02',
    title: 'Publish useful offers',
    description: 'Give pass holders a reason to visit, return, and choose local.',
  },
  {
    number: '03',
    title: 'Support fundraising',
    description: 'Your participation makes the pass more valuable to local campaigns.',
  },
  {
    number: '04',
    title: 'Track the activity',
    description: 'See offers, redemptions, performance, rewards, and community impact.',
  },
]

export default function BusinessPage() {
  return (
    <main className="min-h-screen bg-[#F7FAFC] px-3 py-6 text-slate-950 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/home"
          className="inline-flex min-h-10 items-center text-sm font-black text-blue-700"
        >
          ← Back to RaiseHub
        </Link>

        <section className="relative mt-4 overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-8 text-white shadow-xl sm:px-8 sm:py-12">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-green-500/25 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="relative z-10 max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-300">
              RaiseHub for local businesses
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">
              Grow locally while helping local fundraising work better
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
              Join free, publish offers, reach supporters, and give campaigns a more valuable digital fundraising pass without replacing the checkout system you already use.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/signup/business"
                className="inline-flex min-h-12 items-center rounded-xl bg-green-600 px-5 text-sm font-black text-white transition hover:bg-green-500"
              >
                Join RaiseHub Free
              </Link>
              <a
                href="https://demo.raisehub.app/home"
                className="inline-flex min-h-12 items-center rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/15"
              >
                Explore the Demo
              </a>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-200 py-5 text-center">
          <div className="px-2">
            <p className="text-2xl font-black text-blue-700">$0</p>
            <p className="mt-1 text-xs font-bold text-slate-500">to join</p>
          </div>
          <div className="px-2">
            <p className="text-2xl font-black text-green-700">3</p>
            <p className="mt-1 text-xs font-bold text-slate-500">free active offers</p>
          </div>
          <div className="px-2">
            <p className="text-2xl font-black text-amber-700">Local</p>
            <p className="mt-1 text-xs font-bold text-slate-500">community impact</p>
          </div>
        </section>

        <section className="mt-9">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
            Simple by design
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            How RaiseHub works for businesses
          </h2>

          <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
            {steps.map((step) => (
              <article key={step.number} className="grid gap-3 py-5 sm:grid-cols-[56px_1fr]">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-sm font-black text-green-700">
                  {step.number}
                </span>
                <div>
                  <h3 className="text-lg font-black">{step.title}</h3>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                    {step.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-9" aria-labelledby="business-plans-heading">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            Plans
          </p>
          <h2
            id="business-plans-heading"
            className="mt-1 text-2xl font-black tracking-tight"
          >
            Start free. Upgrade for growth tools.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Community participation stays available on every plan. Growth is for businesses that need more offer capacity and additional promotion or analytics tools.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border-2 border-green-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-green-700">
                    Community Partner
                  </p>
                  <h3 className="mt-2 text-3xl font-black">Free</h3>
                </div>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                  Start here
                </span>
              </div>

              <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
                {freeFeatures.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <span className="font-black text-green-600">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/signup/business"
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-green-700 px-5 text-sm font-black text-white hover:bg-green-800"
              >
                Create Business Profile
              </Link>
            </article>

            <article className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                    Growth Partner
                  </p>
                  <h3 className="mt-2 text-3xl font-black">Optional</h3>
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                  Upgrade
                </span>
              </div>

              <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
                {growthFeatures.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <span className="font-black text-blue-600">+</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-6 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                Existing business members can review current Growth pricing and billing from their authenticated upgrade page.
              </p>
            </article>
          </div>
        </section>

        <section className="mt-9 border-y border-amber-200 bg-amber-50/70 px-4 py-6 sm:px-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
            Founding 100
          </p>
          <h2 className="mt-2 text-2xl font-black">
            Early verified production businesses can earn a founder bonus
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            The first 100 production businesses to become verified receive Founding 100 status and 2× positive Partner Points for one year from verification.
          </p>
        </section>

        <section className="mt-9">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
            Built to fit your business
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            Keep the checkout system you already use
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            RaiseHub supports QR or manual redemption immediately. Businesses can also record their current point-of-sale provider during onboarding while supported integrations expand over time.
          </p>

          <div className="-mr-3 mt-4 flex gap-2 overflow-x-auto pr-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mr-0 sm:flex-wrap sm:pr-0">
            {['Square', 'Clover', 'Toast', 'Shopify POS', 'Stripe Terminal', 'Other / Manual'].map((provider) => (
              <span
                key={provider}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
              >
                {provider}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] bg-gradient-to-r from-green-700 to-blue-700 px-5 py-8 text-white shadow-xl sm:px-8 sm:py-10">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-green-100">
            Ready to participate?
          </p>
          <h2 className="mt-2 max-w-3xl text-3xl font-black">
            Bring in customers while helping local organizations reach their goals
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">
            Create your profile, publish your first offers, and become part of the local marketplace supporters see after buying a RaiseHub Pass.
          </p>
          <Link
            href="/signup/business"
            className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-white px-5 text-sm font-black text-blue-700"
          >
            Start My Free Business Profile
          </Link>
        </section>

        <footer className="mt-8 flex flex-wrap gap-5 border-t border-slate-200 pt-5 text-sm font-bold text-slate-500">
          <Link href="/businesses" className="hover:text-blue-700">
            Local Partners
          </Link>
          <Link href="/support" className="hover:text-blue-700">
            Help
          </Link>
          <Link href="/terms" className="hover:text-blue-700">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-blue-700">
            Privacy
          </Link>
        </footer>
      </div>
    </main>
  )
}
