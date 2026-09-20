import Link from 'next/link'

export const metadata = {
  title: 'School IT & Vendor Access | RaiseHub',
  description:
    'RaiseHub school network allowlist, browser, security, privacy, and vendor-review information.',
}

const coreDomains = [
  'https://raisehub.app',
  'https://www.raisehub.app',
  'https://buoczurgckoazbkwgcik.supabase.co',
]

const checkoutDomains = [
  'https://checkout.stripe.com',
  'https://js.stripe.com',
  'https://api.stripe.com',
]

export default function SchoolItAccessPage() {
  return (
    <main className="min-h-screen bg-[#F0F6FF] px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            School IT & vendor review
          </p>
          <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-5xl">
            RaiseHub network and access requirements
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
            This page is intended for district technology, network, privacy, procurement, and
            vendor-review teams evaluating RaiseHub for school fundraising access.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/schools"
              className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700"
            >
              School setup overview
            </Link>
            <a
              href="mailto:support@raisehub.app?subject=School%20IT%20or%20vendor%20review"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
            >
              Contact RaiseHub support
            </a>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Allowlist
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Core domains</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Permit outbound HTTPS traffic on port 443 to the following domains. Secure WebSocket
            access to the Supabase host should also be permitted when district filtering inspects
            WebSocket traffic.
          </p>
          <div className="mt-4 space-y-2">
            {coreDomains.map((domain) => (
              <code
                key={domain}
                className="block overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-sm text-slate-100"
              >
                {domain}
              </code>
            ))}
          </div>

          <h3 className="mt-7 text-lg font-black text-slate-950">Checkout domains</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            These Stripe domains are needed when a supporter completes a real payment. They are not
            required merely to view the school information or campaign-management screens.
          </p>
          <div className="mt-4 space-y-2">
            {checkoutDomains.map((domain) => (
              <code
                key={domain}
                className="block overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-sm text-slate-100"
              >
                {domain}
              </code>
            ))}
          </div>

          <h3 className="mt-7 text-lg font-black text-slate-950">Optional demo access</h3>
          <code className="mt-3 block overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-sm text-slate-100">
            https://demo.raisehub.app
          </code>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Browser requirements</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
              <li>• Current Chrome, Edge, Safari, or Firefox.</li>
              <li>• JavaScript enabled.</li>
              <li>• First-party cookies enabled for authentication.</li>
              <li>• HTTPS/TLS inspection must not break RaiseHub, Supabase, or Stripe certificates.</li>
              <li>• File downloads/printing are optional and used for CSV rosters and QR sheets.</li>
            </ul>
          </article>

          <article className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Not required</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
              <li>• Camera access is not required for organization setup.</li>
              <li>• Microphone access is not required.</li>
              <li>• Device geolocation is not required for school fundraising setup.</li>
              <li>• Browser pop-ups are not required for core organization management.</li>
              <li>• Students do not need individual accounts for organization-managed seller QR codes.</li>
            </ul>
          </article>
        </section>

        <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">
            Student-data minimization
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Schools can use seller tracking without creating student logins
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            An organization administrator can create campaign roster entries using a seller display
            name, then generate a personal campaign link and QR code. The roster entry can track
            attributed pass sales without requiring the seller to provide an email address,
            password, home address, date of birth, camera access, or device location.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
            A permitted seller may optionally create a RaiseHub account and claim the existing
            roster entry so they can view their own totals and recover their link or QR code later.
            Schools that plan to have minors create accounts should complete their normal privacy
            and consent review first.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Vendor review links
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Public policies and support</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['/privacy', 'Privacy Policy'],
              ['/terms', 'Terms of Use'],
              ['/fundraising-policy', 'Fundraising & Payout Policy'],
              ['/refund-policy', 'Refund Policy'],
              ['/support', 'Help & Contact'],
              ['/schools', 'School Setup'],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-blue-700 hover:border-blue-200 hover:bg-blue-50"
              >
                {label} →
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
            Copy-ready request
          </p>
          <h2 className="mt-2 text-2xl font-black text-amber-950">Suggested note for district IT</h2>
          <div className="mt-4 space-y-2 rounded-2xl border border-amber-200 bg-white p-5 text-sm leading-6 text-slate-700">
            <p>Please review RaiseHub for school fundraising access.</p>
            <p><strong>Core site:</strong> <code>https://raisehub.app</code></p>
            <p><strong>Authentication/data:</strong> <code>https://buoczurgckoazbkwgcik.supabase.co</code></p>
            <p><strong>Checkout:</strong> <code>https://checkout.stripe.com</code>, <code>https://js.stripe.com</code>, <code>https://api.stripe.com</code></p>
            <p><strong>Vendor review:</strong> <code>https://raisehub.app/schools/it-access</code></p>
            <p><strong>Support:</strong> <code>support@raisehub.app</code></p>
          </div>
        </section>

        <p className="px-2 text-xs leading-5 text-slate-500">
          Districts may apply additional local security, procurement, accessibility, records, or
          privacy requirements. Contact support@raisehub.app if your review requires information not
          listed here.
        </p>
      </div>
    </main>
  )
}
