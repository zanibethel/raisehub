import Link from 'next/link'

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
        answer: 'Sign in, open Dashboard, and use the workspace switcher when your account has access to more than one business, organization, or customer experience.',
      },
      {
        question: 'Why can’t I see a workspace I expected?',
        answer: 'The workspace may use a different email, still need an invitation, or may not yet be connected to your account. Include the workspace name in the contact form so Support can investigate.',
      },
    ],
  },
  {
    title: 'Businesses and offers',
    items: [
      {
        question: 'How many active offers can a business publish?',
        answer: 'The current standard plan supports up to three active offers at a time. You can pause an existing offer to free a slot or review upgrade options when available.',
      },
      {
        question: 'Where do I edit or pause an offer?',
        answer: 'Open your Business workspace and choose Offers from the bottom navigation. That page contains offer creation, editing, status, and redemption settings.',
      },
      {
        question: 'Where can I download redemption records?',
        answer: 'Open Reports from the Business workspace navigation. The report page includes recent redemption activity and CSV export tools.',
      },
    ],
  },
  {
    title: 'Organizations and campaigns',
    items: [
      {
        question: 'Where do I manage a campaign?',
        answer: 'Open the Organization workspace and choose Campaigns from the bottom navigation. Campaign editing, seller tools, links, and setup controls belong there rather than on the main dashboard.',
      },
      {
        question: 'Why does my payout setup show incomplete?',
        answer: 'RaiseHub must confirm the required organization information and connected payout account before funds can be transferred. Open the organization tools and complete every requested payout step.',
      },
    ],
  },
  {
    title: 'Purchases and redemptions',
    items: [
      {
        question: 'Where are my purchased offers saved?',
        answer: 'Purchased offers are stored in your customer pass after checkout. Sign in with the same email used for the purchase to view available offers.',
      },
      {
        question: 'What should I do if an offer will not redeem?',
        answer: 'Confirm the offer is active, has not expired, and is being redeemed using the method shown by the business. If it still fails, include the business name and offer title in the contact form.',
      },
      {
        question: 'Does the Interactive Demo charge real money?',
        answer: 'No. The Interactive Demo uses sample data and must not create a real Stripe payment. Use the Live Platform when you are ready to make a real purchase or manage real activity.',
      },
    ],
  },
]

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#F0F6FF] px-4 py-6 pb-28 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">RaiseHub Help</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">How can we help?</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Find a quick answer below. When the FAQ does not solve it, send the details directly to RaiseHub Support.
          </p>
          <Link href="/dashboard" className="mt-5 inline-flex text-sm font-bold text-blue-700 hover:text-blue-900">
            ← Return to dashboard
          </Link>
        </header>

        <section className="mt-6">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Frequently asked questions</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Start with the fastest answer</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {faqGroups.map((group) => (
              <section key={group.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h3 className="text-lg font-black text-slate-950">{group.title}</h3>
                <div className="mt-4 divide-y divide-slate-100">
                  {group.items.map((item) => (
                    <details key={item.question} className="group py-3 first:pt-0 last:pb-0">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900">
                        <span>{item.question}</span>
                        <span aria-hidden="true" className="text-xl text-blue-600 transition group-open:rotate-45">+</span>
                      </summary>
                      <p className="mt-2 pr-6 text-sm leading-6 text-slate-600">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <section id="contact" className="mt-6 scroll-mt-24 rounded-3xl border border-blue-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Contact us</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Still need help?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Give us enough detail to understand the problem without asking you to repeat everything later.
          </p>
          <div className="mt-5">
            <SupportContactForm />
          </div>
        </section>
      </div>
    </main>
  )
}
