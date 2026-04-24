import LogoCarousel from './components/logo-carousel'
import FeaturedDealsCarousel from './components/featured-deals-carousel'

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-100 via-slate-50 to-green-50 px-8 py-16 text-gray-900">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-120px] h-[360px] w-[700px] -translate-x-1/2 rounded-full bg-blue-400/30 blur-3xl" />
        <div className="absolute left-[-80px] top-[280px] h-[260px] w-[260px] rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[320px] w-[320px] rounded-full bg-green-300/25 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl text-center">
        <p className="inline-flex rounded-full border border-blue-200 bg-white/85 px-4 py-1 text-sm font-medium text-blue-700 shadow-sm backdrop-blur">
          Fundraising powered by local businesses
        </p>

        <h1 className="mt-6 text-5xl font-bold tracking-tight text-blue-700 sm:text-6xl">
          RaiseHub
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-700">
          Raise money for schools and organizations while promoting local businesses.
          Supporters save locally, businesses gain visibility, and communities win together.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="/signup"
            className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white shadow-lg transition hover:bg-blue-700 hover:shadow-xl"
          >
            Get Started
          </a>

          <a
            href="/dashboard"
            className="rounded-xl border border-gray-300 bg-white/90 px-6 py-3 font-medium text-gray-700 shadow-sm backdrop-blur transition hover:border-blue-600 hover:text-blue-600"
          >
            View Dashboard
          </a>
        </div>
      </div>

      <LogoCarousel />
      <FeaturedDealsCarousel />

      <div className="mx-auto mt-16 grid max-w-5xl gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-xl backdrop-blur">
          <h2 className="text-lg font-semibold text-blue-700">For schools</h2>
          <p className="mt-2 text-sm text-gray-600">
            Launch digital fundraising passes that supporters can buy online and use for months.
          </p>
        </div>

        <div className="rounded-2xl border border-green-100 bg-white/90 p-6 shadow-xl backdrop-blur">
          <h2 className="text-lg font-semibold text-green-700">For businesses</h2>
          <p className="mt-2 text-sm text-gray-600">
            Promote local offers, attract new customers, and track redemption performance in one place.
          </p>
        </div>

        <div className="rounded-2xl border border-yellow-100 bg-white/90 p-6 shadow-xl backdrop-blur">
          <h2 className="text-lg font-semibold text-yellow-600">For supporters</h2>
          <p className="mt-2 text-sm text-gray-600">
            Buy a pass, save money at local businesses, and help fund programs that matter.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-5xl rounded-3xl border border-white/60 bg-white/85 p-8 shadow-xl backdrop-blur">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-3xl font-bold text-blue-700">6 Months</p>
            <p className="mt-2 text-sm text-gray-600">
              Reusable digital pass access for supporters
            </p>
          </div>

          <div>
            <p className="text-3xl font-bold text-green-700">Local Growth</p>
            <p className="mt-2 text-sm text-gray-600">
              More visibility and foot traffic for participating businesses
            </p>
          </div>

          <div>
            <p className="text-3xl font-bold text-yellow-600">Shared Impact</p>
            <p className="mt-2 text-sm text-gray-600">
              Schools, organizations, businesses, and families all benefit together
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}