import Link from 'next/link'

import CustomerSupportHistory from './customer-support-history'
import SupportContactForm from './support-contact-form'

export const metadata = {
  title: 'Help & Contact | RaiseHub',
  description: 'Find answers to common RaiseHub questions or contact support.',
}

const faqGroups = [
  {
    title: 'Accounts and access',
    items: [
      {
        question: 'How do I get back to my workspace?',
        answer:
          'Sign in, open Dashboard, and use the workspace switcher when your account has access to more than one business, organization, or customer experience.',
      },
      {
        question: 'Why can’t I see a workspace I expected?',
        answer:
          'The workspace may use a different email, still need an invitation, or may not yet be connected to your account. Include the workspace name in the contact form so Support can investigate.',
      },
    ],
  },
  {
    title: 'Businesses and offers',
    items: [
      {
        question: 'How many active offers can a business publish?',
        answer:
          'The current standard plan supports up to three active offers at a time. You can pause an existing offer to free a slot or review upgrade options when available.',
      },
      {
        question: 'Where do I edit or pause an offer?',
        answer:
          'Open your Business workspace and choose Offers from the bottom navigation. That page contains offer creation, editing, status, and redemption settings.',
      },
      {
        question: 'Where can I download redemption records?',
        answer:
          'Open Reports from the Business workspace navigation. The report page includes recent redemption activity and CSV export tools.',
      },
    ],
  },
  {
    title: 'Organizations and campaigns',
    items: [
      {
        question: 'Where do I manage a campaign?',
        answer:
          'Open the Organization workspace and choose Campaigns from the bottom navigation. Campaign editing, seller tools, links, and setup controls belong there rather than on the main dashboard.',
      },
      {
        question: 'Why does my payout setup show incomplete?',
        answer:
          'RaiseHub must confirm the required organization information and connected payout account before funds can be transferred. Open the organization tools and complete every requested payout step.',
      },
    ],
  },
  {
    title: 'Purchases and redemptions',
    items: [
      {
        question: 'Where are my purchased offers saved?',
        answer:
          'Purchased offers are stored in your customer pass after checkout. Sign in with the same email used for the purchase to view available offers.',
      },
      {
        question: 'What should I do if an offer will not redeem?',
        answer:
          'Confirm the offer is active, has not expired, and is being redeemed using the method shown by the business. If it still fails, include the business name and offer title in the contact form.',
      },
      {
        question: 'Does the Interactive Demo charge real money?',
        answer:
          'No. The Interactive Demo uses sample data and must not create a real Stripe payment. Use the Live Platform when you are ready to make a real purchase or manage real activity.',
      },
    ],
  },
]

const supportRoutes = [
  {
    label: 'Account & platform',
    email: 'support@raisehub.app',
    description: 'Sign-in, workspace access, technical issues and general platform help.',
    tone: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  {
    label: 'Billing & payments',
    email: 'billing@raisehub.app',
    description: 'Charges, payments, payouts, invoices and purchase issues.',
    tone: 'text-amber-800 bg-amber-50 border-amber-200',
  },
  {
    label: 'Businesses & organizations',
    email: 'partners@raisehub.app',
    description: 'Fundraising, partnerships and participation questions.',
    tone: 'text-green-700 bg-green-50 border-green-200',
  },
  {
    label: 'General contact',
    email: 'contact@raisehub.app',
    description: 'Questions that do not clearly fit another support route.',
    tone: 'text-slate-700 bg-slate-50 border-slate-200',
  },
]

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#F7FAFC] px-3 py-6 pb-24 text-slate-950 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="inline-flex min-h-10 items-center text-sm font-black text-blue-700"
        >
          ← Return to dashboard
        </Link>

        <header className="relative mt-4 overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-7 text-white shadow-xl sm:px-8 sm:py-10">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-500/25 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-green-500/15 blur-3xl" />

          <div className="relative z-10 max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
              RaiseHub Help
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Get the right help without hunting for it
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Start with a quick answer, check an existing request, or send the problem directly to RaiseHub Support.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="#contact"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-500"
              >
                Contact Support
              </a>
              <Link
                href="/schools/it-access"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-slate-100 transition hover:bg-white/15"
              >
                School IT Access
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-6" aria-labelledby="support-routes-heading">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            Fastest route
          </p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h2
              id="support-routes-heading"
              className="text-2xl font-black tracking-tight"
            >
              Choose the help you need
            </h2>
            <a href="#contact" className="text-sm font-black text-blue-700">
              Send request →
            </a>
          </div>

          <div className="-mr-3 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pr-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mr-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pr-0">
            {supportRoutes.map((route) => (
              <a
                key={route.email}
                href={`mailto:${route.email}`}
                className="w-[82%] min-w-[82%] snap-start rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md sm:w-auto sm:min-w-0"
              >
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${route.tone}`}>
                  {route.label}
                </span>
                <p className="mt-3 break-all text-sm font-black text-blue-700">
                  {route.email}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {route.description}
                </p>
              </a>
            ))}
          </div>
        </section>

        <CustomerSupportHistory />

        <section className="mt-8" aria-labelledby="support-faq-heading">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Frequently asked questions
          </p>
          <h2
            id="support-faq-heading"
            className="mt-1 text-2xl font-black tracking-tight"
          >
            Start with the fastest answer
          </h2>

          <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
            {faqGroups.map((group) => (
              <section key={group.title} className="py-5">
                <h3 className="text-lg font-black text-slate-950">
                  {group.title}
                </h3>
                <div className="mt-2 divide-y divide-slate-100">
                  {group.items.map((item) => (
                    <details key={item.question} className="group py-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black text-slate-900">
                        <span>{item.question}</span>
                        <span
                          aria-hidden="true"
                          className="shrink-0 text-xl text-blue-600 transition group-open:rotate-45"
                        >
                          +
                        </span>
                      </summary>
                      <p className="mt-2 max-w-3xl pr-8 text-sm leading-6 text-slate-600">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="mt-8 border-y border-blue-200 bg-blue-50/70 px-4 py-5 sm:px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                Schools & districts
              </p>
              <h2 className="mt-1 text-xl font-black">
                Blocked on a school computer?
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                The School IT page has RaiseHub domains, browser requirements, privacy links and a copy-ready request for district IT.
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <Link
                href="/schools/it-access"
                className="inline-flex min-h-11 items-center rounded-xl bg-blue-700 px-4 text-sm font-black text-white"
              >
                IT Access
              </Link>
              <Link
                href="/schools"
                className="inline-flex min-h-11 items-center rounded-xl border border-blue-200 bg-white px-4 text-sm font-black text-blue-700"
              >
                School Guide
              </Link>
            </div>
          </div>
        </section>

        <section id="contact" className="mt-9 scroll-mt-24">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
            Contact us
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            Still need help?
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Tell us what happened, what you expected, and where it occurred. Signed-in requests can be tracked on this page.
          </p>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <SupportContactForm />
          </div>
        </section>

        <footer className="mt-8 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
          Legal or privacy correspondence can be sent to{' '}
          <a
            href="mailto:legal@raisehub.app"
            className="font-black text-blue-700"
          >
            legal@raisehub.app
          </a>.
        </footer>
      </div>
    </main>
  )
}
