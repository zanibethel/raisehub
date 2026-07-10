import Link from 'next/link'

const freeFeatures = [
  'Business profile and community partner badge',
  'Up to 3 active offers',
  'Participation in local fundraising',
  'Customer-selected organization support',
  'Basic offer and redemption tracking',
  'QR or manual coupon redemption',
]

const growthFeatures = [
  'More than 3 active offers',
  'Priority placement in business listings',
  'Featured promotional opportunities',
  'AI credits for ads and offer creation',
  'Advanced analytics and customer insights',
  'Additional locations and team access',
]

const steps = [
  {
    number: '01',
    title: 'Create your free profile',
    description:
      'Tell customers who you are, what you offer, and how to find your business.',
  },
  {
    number: '02',
    title: 'Publish up to 3 offers',
    description:
      'Create meaningful discounts that attract new customers and encourage repeat visits.',
  },
  {
    number: '03',
    title: 'Support local organizations',
    description:
      'Customers choose which participating school, team, nonprofit, or community group benefits.',
  },
  {
    number: '04',
    title: 'Track your impact',
    description:
      'See offer activity, redemptions, customer engagement, and the community impact you helped create.',
  },
]

const benefits = [
  {
    title: 'Attract new customers',
    description:
      'Give local shoppers a reason to discover your business and choose you over larger competitors.',
  },
  {
    title: 'Strengthen your reputation',
    description:
      'Show customers that your business actively supports the schools and organizations they care about.',
  },
  {
    title: 'Promote meaningful offers',
    description:
      'Use offers to fill slower days, introduce new services, encourage repeat visits, or reward loyal customers.',
  },
  {
    title: 'Keep your current checkout',
    description:
      'Start with simple QR or manual redemption. Supported POS connections can be added as integrations become available.',
  },
]

export default function BusinessPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-100 via-slate-50 to-green-50 px-5 py-14 text-gray-900 sm:px-8 sm:py-20">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-160px] h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-blue-400/25 blur-3xl" />
        <div className="absolute left-[-100px] top-[500px] h-[300px] w-[300px] rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-100px] h-[360px] w-[360px] rounded-full bg-green-300/25 blur-3xl" />
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-6xl text-center">
        <p className="inline-flex rounded-full border border-green-200 bg-white/85 px-4 py-2 text-sm font-semibold text-green-700 shadow-sm backdrop-blur">
          Free for local businesses to join
        </p>

        <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold tracking-tight text-blue-700 sm:text-6xl">
          Grow your business.
          <span className="block text-green-700">
            Strengthen your community.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-700">
          RaiseHub helps local businesses attract customers through valuable
          offers while letting every customer choose which local organization
          their purchase supports.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup?role=business"
            className="w-full rounded-xl bg-green-600 px-7 py-3.5 font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-xl sm:w-auto"
          >
            Join RaiseHub Free
          </Link>

          <Link
            href="/"
            className="w-full rounded-xl border border-blue-200 bg-white/90 px-7 py-3.5 font-semibold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md sm:w-auto"
          >
            Explore the Demo
          </Link>
        </div>

        <p className="mt-4 text-sm text-gray-600">
          No signup fee. No monthly fee required. Create up to 3 active offers
          at no cost.
        </p>
      </section>

      {/* Value statement */}
      <section className="mx-auto mt-16 max-w-6xl rounded-3xl border border-white/70 bg-white/85 p-7 shadow-xl backdrop-blur sm:p-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-3xl font-bold text-blue-700">$0</p>
            <p className="mt-2 font-semibold text-gray-900">To join RaiseHub</p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Community participation should never require a subscription.
            </p>
          </div>

          <div>
            <p className="text-3xl font-bold text-green-700">3 offers</p>
            <p className="mt-2 font-semibold text-gray-900">
              Included on the free plan
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Create offers that help bring in new and returning customers.
            </p>
          </div>

          <div>
            <p className="text-3xl font-bold text-yellow-600">Your community</p>
            <p className="mt-2 font-semibold text-gray-900">
              Supported on every plan
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Customers decide which eligible organization receives the
              fundraising benefit.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto mt-20 max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-700">
            Simple by design
          </p>

          <h2 className="mt-3 text-3xl font-bold text-blue-700 sm:text-4xl">
            How RaiseHub works for businesses
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-gray-600">
            Join, create an offer, support the community, and begin sharing your
            business through one simple platform.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {steps.map((step) => (
            <article
              key={step.number}
              className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-lg"
            >
              <p className="text-sm font-bold text-green-700">{step.number}</p>
              <h3 className="mt-2 text-xl font-semibold text-blue-700">
                {step.title}
              </h3>
              <p className="mt-3 leading-7 text-gray-600">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto mt-20 max-w-6xl">
        <div className="rounded-3xl bg-blue-700 p-7 text-white shadow-xl sm:p-10">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-100">
              More than a coupon listing
            </p>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Give customers another reason to choose local
            </h2>

            <p className="mt-4 leading-7 text-blue-100">
              Your offer helps customers save. Your community participation
              gives them a reason to feel good about choosing your business.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {benefits.map((benefit) => (
              <article
                key={benefit.title}
                className="rounded-2xl border border-white/15 bg-white/10 p-6"
              >
                <h3 className="text-lg font-semibold">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-6 text-blue-100">
                  {benefit.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Plan comparison */}
      <section className="mx-auto mt-20 max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-700">
            Start free
          </p>

          <h2 className="mt-3 text-3xl font-bold text-blue-700 sm:text-4xl">
            Pay for growth tools, not generosity
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-gray-600">
            Supporting organizations remains available to every participating
            business. Upgrades are only for businesses that want more offers,
            more exposure, or additional marketing tools.
          </p>
        </div>

        <div className="mt-10 grid gap-7 lg:grid-cols-2">
          <article className="rounded-3xl border-2 border-green-200 bg-white/95 p-7 shadow-xl sm:p-9">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">
              Community Partner
            </p>

            <div className="mt-4 flex items-end gap-2">
              <p className="text-4xl font-bold text-gray-900">Free</p>
              <p className="pb-1 text-gray-500">to join</p>
            </div>

            <p className="mt-4 text-gray-600">
              Everything needed to participate, create offers, attract
              customers, and support local organizations.
            </p>

            <ul className="mt-7 space-y-3">
              {freeFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex gap-3 text-sm leading-6 text-gray-700"
                >
                  <span className="font-bold text-green-600">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/signup?role=business"
              className="mt-8 block rounded-xl bg-green-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-green-700"
            >
              Become a Community Partner
            </Link>
          </article>

          <article className="rounded-3xl border border-blue-200 bg-white/90 p-7 shadow-xl sm:p-9">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
              Growth Partner
            </p>

            <div className="mt-4 flex items-end gap-2">
              <p className="text-4xl font-bold text-gray-900">Optional</p>
              <p className="pb-1 text-gray-500">upgrade</p>
            </div>

            <p className="mt-4 text-gray-600">
              Additional tools for businesses that want greater visibility,
              more offer flexibility, and AI-powered marketing help.
            </p>

            <ul className="mt-7 space-y-3">
              {growthFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex gap-3 text-sm leading-6 text-gray-700"
                >
                  <span className="font-bold text-blue-600">+</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <p className="mt-8 rounded-xl bg-blue-50 px-5 py-3 text-center text-sm font-medium text-blue-700">
              Upgrade only when your business is ready for more growth tools.
            </p>
          </article>
        </div>
      </section>

      {/* POS section */}
      <section className="mx-auto mt-20 max-w-6xl rounded-3xl border border-yellow-100 bg-white/90 p-7 shadow-xl sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">
              Built to fit your business
            </p>

            <h2 className="mt-3 text-3xl font-bold text-blue-700">
              Keep the checkout system you already use
            </h2>

            <p className="mt-4 leading-7 text-gray-600">
              During onboarding, businesses can select their current point-of-sale
              system. RaiseHub can provide QR or manual redemption immediately,
              with enhanced connections added for supported systems such as
              Square, Clover, Toast, Shopify POS, and Stripe Terminal.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center text-sm font-semibold text-gray-700">
            {[
              'Square',
              'Clover',
              'Toast',
              'Shopify POS',
              'Stripe Terminal',
              'Other / Manual',
            ].map((provider) => (
              <div
                key={provider}
                className="rounded-xl border border-gray-200 bg-slate-50 px-4 py-4"
              >
                {provider}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto mt-20 max-w-5xl rounded-3xl bg-gradient-to-r from-green-600 to-blue-700 px-7 py-12 text-center text-white shadow-2xl sm:px-12">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-green-100">
          Become a founding community partner
        </p>

        <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-bold sm:text-4xl">
          Bring in customers while helping local organizations reach their goals
        </h2>

        <p className="mx-auto mt-5 max-w-2xl leading-7 text-blue-50">
          Join RaiseHub free, create your first offers, and help shape a new
          local marketplace built around business growth and community impact.
        </p>

        <Link
          href="/signup?role=business"
          className="mt-8 inline-flex rounded-xl bg-white px-7 py-3.5 font-semibold text-blue-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          Start My Free Business Profile
        </Link>
      </section>

      {/* Footer links */}
      <footer className="mx-auto mt-16 max-w-6xl border-t border-blue-100 pt-7 text-center text-sm text-gray-500">
        <div className="flex flex-wrap justify-center gap-5">
          <Link href="/" className="hover:text-blue-700">
            RaiseHub Home
          </Link>
          <Link href="/terms" className="hover:text-blue-700">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-blue-700">
            Privacy
          </Link>
        </div>

        <p className="mt-4">© {new Date().getFullYear()} RaiseHub</p>
      </footer>
    </main>
  )
}