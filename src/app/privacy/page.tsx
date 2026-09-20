import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-gray-900">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-blue-700">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated September 19, 2026</p>

        <div className="mt-6 space-y-6 text-sm leading-6 text-gray-700">
          <section>
            <h2 className="font-bold text-gray-900">Information RaiseHub uses</h2>
            <p className="mt-2">
              RaiseHub collects basic account, campaign, offer, purchase, redemption, seller/referral,
              and usage information needed to operate the platform.
            </p>
            <p className="mt-2">
              This may include names, display names, emails, organization details, business details,
              offer activity, campaign activity, referral or seller tracking, support requests, and
              purchase records.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900">How the information is used</h2>
            <p className="mt-2">
              We use this information to provide dashboards, track fundraising progress, attribute
              seller activity, manage passes, support local offers, provide customer support, improve
              the platform, and prevent abuse.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900">School and youth fundraising</h2>
            <p className="mt-2">
              RaiseHub is designed so an organization can create seller, student, or participant
              roster entries without requiring each person to create an account. A managed roster
              entry can use a display name, referral link, and QR code to attribute campaign activity.
            </p>
            <p className="mt-2">
              A seller account is optional. When a permitted seller creates an account, RaiseHub may
              collect the seller&apos;s display name, email, authentication information, optional
              profile details, campaign connections, and attributed activity.
            </p>
            <p className="mt-2">
              Schools and organizations that plan to have children create individual accounts should
              complete their normal privacy and consent review first. RaiseHub recommends the
              organization-managed roster path for younger students when an individual account is not
              necessary.
            </p>
            <Link href="/schools/it-access" className="mt-2 inline-flex font-semibold text-blue-700 hover:underline">
              School IT and vendor-review information →
            </Link>
          </section>

          <section>
            <h2 className="font-bold text-gray-900">Sharing and service providers</h2>
            <p className="mt-2">
              We do not sell personal information. Limited information may be shared with
              organizations or businesses when needed to support fundraising, redemption, reporting,
              security, or customer service.
            </p>
            <p className="mt-2">
              RaiseHub uses service providers for functions such as authentication, database hosting,
              application hosting, email delivery, and payment processing. Payment information is
              processed by a third-party payment provider such as Stripe. RaiseHub does not store full
              card numbers.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-900">Your choices and questions</h2>
            <p className="mt-2">
              Users may contact RaiseHub to request help with account information, purchase questions,
              school vendor review, or privacy concerns.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a href="mailto:legal@raisehub.app" className="font-semibold text-blue-700 hover:underline">
                legal@raisehub.app
              </a>
              <Link href="/support" className="font-semibold text-blue-700 hover:underline">
                Help &amp; Contact
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
