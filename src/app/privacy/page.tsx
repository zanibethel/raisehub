export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-gray-900">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-blue-700">Privacy Policy</h1>

        <div className="mt-6 space-y-4 text-sm leading-6 text-gray-700">
          <p>
            RaiseHub collects basic account, campaign, offer, purchase,
            redemption, and usage information needed to operate the platform.
          </p>

          <p>
            This may include names, emails, organization details, business
            details, offer activity, campaign activity, referral/seller
            tracking, and purchase records.
          </p>

          <p>
            We use this information to provide dashboards, track fundraising
            progress, manage passes, support local offers, improve the platform,
            and prevent abuse.
          </p>

          <p>
            We do not sell personal information. Limited information may be
            shared with organizations or businesses when needed to support
            fundraising, redemption, reporting, or customer service.
          </p>

          <p>
            Payment information will be processed by a third-party payment
            provider such as Stripe. RaiseHub does not store full card numbers.
          </p>

          <p>
            Users may contact RaiseHub to request help with account information,
            purchase questions, or privacy concerns.
          </p>
        </div>
      </div>
    </main>
  )
}