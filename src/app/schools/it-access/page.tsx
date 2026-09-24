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
        <header className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-7 text-white shadow-xl sm:px-8 sm:py-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
            School IT & vendor review
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-5xl">
            RaiseHub network and access requirements
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
            This page is intended for district technology, network, privacy, procurement, and
            vendor-review teams evaluating RaiseHub for school fundraising access.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/schools"
              className="inline-flex min-h-11 items-center rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-black text-white"
            >
              School setup overview
            </Link>
            <a
              href="mailto:support@raisehub.app?subject=School%20IT%20or%20vendor%20review"
              className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-4 text-sm font-black text-white"
            >
              Contact RaiseHub support
            </a>
          </div>
        </header>

        <section className="mt-8 border-y border-slate-200 py-6">
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
                className="block break-all whitespace-normal rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-sm leading-6 text-slate-100 [overflow-wrap:anywhere]"
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
                className="block break-all whitespace-normal rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-sm leading-6 text-slate-100 [overflow-wrap:anywhere]"
              >
                {domain}
              </code>
            ))}
          </div>

          <h3 className="mt-7 text-lg font-black text-slate-950">Optional demo access</h3>
          <code className="mt-3 block break-all whitespace-normal rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-sm leading-6 text-slate-100 [overflow-wrap:anywhere]">
            https://demo.raisehub.app
          </code>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <h2 className="text-xl font-black text-slate-950">Browser requirements</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
              <li>• Current Chrome, Edge, Safari, or Firefox.</li>
              <li>• JavaScript enabled.</li>
              <li>• First-party cookies enabled for authentication.</li>
              <li>• HTTPS/TLS inspection must not break RaiseHub, Supabase, or Stripe certificates.</li>
              <li>• File downloads/printing are optional and used for CSV rosters and QR sheets.</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-green-200 bg-green-50 p-5">
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

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5">
            <p className="text-xs font-black uppercase tracking-wide text-cyan-700">
              Service architecture
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              Core vendors used by RaiseHub
            </h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
              <li>• Vercel hosts and delivers the RaiseHub web application.</li>
              <li>• Supabase provides authentication and application database services.</li>
              <li>• Stripe processes checkout and payment information.</li>
              <li>• RaiseHub does not require a school to install desktop software or a browser extension.</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-5">
            <p className="text-xs font-black uppercase tracking-wide text-fuchsia-700">
              Accessibility & procurement
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              Need district-specific documentation?
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Districts may require accessibility, security, privacy, purchasing, or vendor forms
              beyond this public page. RaiseHub does not represent that a formal VPAT or independent
              accessibility certification has been completed unless that documentation is provided
              directly.
            </p>
            <a
              href="mailto:support@raisehub.app?subject=School%20vendor%20documentation%20request"
              className="mt-4 inline-flex font-bold text-blue-700 hover:underline"
            >
              Request vendor documentation →
            </a>
          </article>
        </section>

        <section className="mt-8 border-y border-violet-200 bg-violet-50/60 px-4 py-6 sm:px-5">
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

        <section className="mt-8 border-y border-slate-200 py-6">
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

        <section className="mt-8 border-y border-amber-200 bg-amber-50 px-4 py-6 sm:px-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
            Copy-ready request
          </p>
          <h2 className="mt-2 text-2xl font-black text-amber-950">Suggested note for district IT</h2>
          <div className="mt-4 min-w-0 space-y-2 overflow-hidden rounded-2xl border border-amber-200 bg-white p-5 text-sm leading-6 text-slate-700">
            <p>Please review RaiseHub for school fundraising access.</p>
            <p><strong>Core site:</strong> <code className="break-all [overflow-wrap:anywhere]">https://raisehub.app</code></p>
            <p><strong>Authentication/data:</strong> <code className="break-all [overflow-wrap:anywhere]">https://buoczurgckoazbkwgcik.supabase.co</code></p>
            <p><strong>Checkout:</strong> <code className="break-all [overflow-wrap:anywhere]">https://checkout.stripe.com</code>, <code className="break-all [overflow-wrap:anywhere]">https://js.stripe.com</code>, <code className="break-all [overflow-wrap:anywhere]">https://api.stripe.com</code></p>
            <p><strong>Vendor review:</strong> <code className="break-all [overflow-wrap:anywhere]">https://raisehub.app/schools/it-access</code></p>
            <p><strong>Support:</strong> <code className="break-all [overflow-wrap:anywhere]">support@raisehub.app</code></p>
          </div>
        </section>

        <p className="mt-6 px-2 text-xs leading-5 text-slate-500">
          Districts may apply additional local security, procurement, accessibility, records, or
          privacy requirements. Contact support@raisehub.app if your review requires information not
          listed here.
        </p>
      </div>
    </main>
  )
}
