import Link from 'next/link'

import PolicyPageNav from '@/app/components/policy-page-nav'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F7FAFC] px-3 py-6 text-slate-950 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/home"
          className="inline-flex min-h-10 items-center text-sm font-black text-blue-700"
        >
          ← Back to RaiseHub
        </Link>

        <header className="relative mt-4 overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-7 text-white shadow-xl sm:px-8 sm:py-9">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-green-500/20 blur-3xl" />
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-300">
              RaiseHub policies
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="mt-3 text-sm text-slate-300">
              Last updated September 19, 2026
            </p>
          </div>
        </header>

        <div className="mt-5">
          <PolicyPageNav active="privacy" />
        </div>

        <div className="mt-7 divide-y divide-slate-200 border-y border-slate-200 text-sm leading-7 text-slate-700">
          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Information RaiseHub uses</h2>
            <p className="mt-2">
              RaiseHub collects basic account, campaign, offer, purchase, redemption, seller/referral, and usage information needed to operate the platform.
            </p>
            <p className="mt-2">
              This may include names, display names, emails, organization details, business details, offer activity, campaign activity, referral or seller tracking, support requests, and purchase records.
            </p>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">How the information is used</h2>
            <p className="mt-2">
              We use this information to provide dashboards, track fundraising progress, attribute seller activity, manage passes, support local offers, provide customer support, improve the platform, and prevent abuse.
            </p>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">School and youth fundraising</h2>
            <p className="mt-2">
              RaiseHub is designed so an organization can create seller, student, or participant roster entries without requiring each person to create an account. A managed roster entry can use a display name, referral link, and QR code to attribute campaign activity.
            </p>
            <p className="mt-2">
              A seller account is optional. When a permitted seller creates an account, RaiseHub may collect the seller&apos;s display name, email, authentication information, optional profile details, campaign connections, and attributed activity.
            </p>
            <p className="mt-2">
              Schools and organizations that plan to have children create individual accounts should complete their normal privacy and consent review first. RaiseHub recommends the organization-managed roster path for younger students when an individual account is not necessary.
            </p>
            <Link
              href="/schools/it-access"
              className="mt-3 inline-flex font-black text-blue-700"
            >
              School IT and vendor-review information →
            </Link>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Sharing and service providers</h2>
            <p className="mt-2">
              We do not sell personal information. Limited information may be shared with organizations or businesses when needed to support fundraising, redemption, reporting, security, or customer service.
            </p>
            <p className="mt-2">
              RaiseHub uses service providers for functions such as authentication, database hosting, application hosting, email delivery, and payment processing. Payment information is processed by a third-party payment provider such as Stripe. RaiseHub does not store full card numbers.
            </p>
          </section>

          <section className="py-5">
            <h2 className="text-lg font-black text-slate-950">Your choices and questions</h2>
            <p className="mt-2">
              Users may contact RaiseHub to request help with account information, purchase questions, school vendor review, or privacy concerns.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href="mailto:legal@raisehub.app"
                className="font-black text-blue-700"
              >
                legal@raisehub.app
              </a>
              <Link href="/support" className="font-black text-blue-700">
                Help & Contact
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
