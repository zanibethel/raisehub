import Link from 'next/link'

export const metadata = {
  title: 'Schools & School Groups | RaiseHub',
  description:
    'School-friendly RaiseHub setup guidance for districts, campuses, PTAs, PTOs, booster clubs, and student fundraising groups.',
}

const officialResources = [
  {
    label: 'Texas Comptroller — School Fundraisers',
    href: 'https://comptroller.texas.gov/taxes/publications/94-183.php',
  },
  {
    label: 'Texas Comptroller — PTAs',
    href: 'https://comptroller.texas.gov/taxes/exempt/pta.php',
  },
  {
    label: 'Texas Comptroller — PTOs',
    href: 'https://comptroller.texas.gov/taxes/exempt/pto.php',
  },
  {
    label: 'Texas Comptroller — Booster Clubs',
    href: 'https://comptroller.texas.gov/taxes/exempt/booster.php',
  },
  {
    label: 'IRS — Employer Identification Numbers',
    href: 'https://www.irs.gov/charities-non-profits/employer-identification-number',
  },
]

const organizationTypes = [
  {
    eyebrow: 'School or district-controlled group',
    title: 'Use the entity your district authorizes',
    text: 'A teacher, sponsor, coach, or campus club should coordinate with the district or campus finance office before entering payout information. RaiseHub will not tell a school-controlled group to create a separate EIN simply to open a fundraiser.',
    tone: 'text-blue-700',
  },
  {
    eyebrow: 'PTA or PTO',
    title: 'Use the parent organization’s own legal identity',
    text: 'Texas generally treats PTAs and PTOs separately from the school’s exempt status. If the parent organization claims an exemption, use the organization’s own approved records rather than the school’s tax identity.',
    tone: 'text-green-700',
  },
  {
    eyebrow: 'Booster club',
    title: 'Keep booster finances separate from the school',
    text: 'Texas does not automatically extend a school’s exempt status to a booster club. The booster club should use its own legal, tax, and payout information when it is the fundraiser owner.',
    tone: 'text-violet-700',
  },
  {
    eyebrow: 'Other nonprofit or community group',
    title: 'Match RaiseHub to the real organization',
    text: 'Use the organization that is actually authorized to receive the fundraiser proceeds. An EIN identifies an organization, but an EIN by itself does not establish that the organization is tax-exempt.',
    tone: 'text-amber-700',
  },
]

export default function SchoolsPage() {
  return (
    <main className="min-h-screen bg-[#F7FAFC] px-3 py-6 text-slate-950 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/home"
          className="inline-flex min-h-10 items-center text-sm font-black text-blue-700"
        >
          ← Back to RaiseHub
        </Link>

        <header className="relative mt-4 overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-7 text-white shadow-xl sm:px-8 sm:py-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/25 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-green-500/15 blur-3xl" />

          <div className="relative z-10 max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
              RaiseHub for schools
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
              Fundraising that fits how schools actually operate
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
              RaiseHub can support district-controlled school groups, student clubs, PTAs, PTOs, booster clubs, teams, and other community organizations. Start by identifying which legal or school entity is actually running the fundraiser.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/signup/organization"
                className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-500"
              >
                Start Organization Account
              </Link>
              <Link
                href="/schools/it-access"
                className="inline-flex min-h-11 items-center rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-black text-white hover:bg-white/15"
              >
                School IT & Vendor Access
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-8" aria-labelledby="school-entity-heading">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            Choose the right entity
          </p>
          <h2
            id="school-entity-heading"
            className="mt-1 text-2xl font-black tracking-tight"
          >
            Match the fundraiser to who actually owns it
          </h2>

          <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
            {organizationTypes.map((item) => (
              <article key={item.eyebrow} className="py-5">
                <p className={`text-xs font-black uppercase tracking-[0.12em] ${item.tone}`}>
                  {item.eyebrow}
                </p>
                <h3 className="mt-1 text-xl font-black">{item.title}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-9">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
            Student & seller participation
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            Student accounts are optional
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            An organization can add seller, student, or participant display names to a campaign roster and generate an individual link and QR code for each person. A student does not need an email address or RaiseHub account for that managed roster entry to receive campaign credit.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">
                Lower-data path
              </p>
              <h3 className="mt-2 text-lg font-black text-blue-950">
                Organization-managed seller
              </h3>
              <p className="mt-2 text-sm leading-6 text-blue-900">
                The organizer creates the roster entry, prints or shares the QR code, and can view seller totals. This is the preferred low-data path for younger students.
              </p>
            </article>

            <article className="rounded-2xl border border-green-200 bg-green-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-green-700">
                Optional account
              </p>
              <h3 className="mt-2 text-lg font-black text-green-950">
                Seller claims the existing roster entry
              </h3>
              <p className="mt-2 text-sm leading-6 text-green-900">
                A permitted seller can keep the same referral history, see their own results, update their profile, and retrieve their personal link or QR code later.
              </p>
            </article>
          </div>

          <div className="mt-4 border-l-4 border-amber-400 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
            For children under 13, use the organization-managed roster by default. Do not direct a child to create their own RaiseHub account unless the school or organization has confirmed the appropriate parent or school authorization.
          </div>
        </section>

        <section className="mt-9 border-y border-slate-200 py-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            Public seller links
          </p>
          <h2 className="mt-2 text-2xl font-black">
            QR codes open the fundraiser, not a student-data page
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            A seller QR code opens the public campaign purchase page with that seller’s attribution attached. Supporters can see overall fundraiser progress and the seller’s public progress, then purchase a pass or buy a separate pass as a gift. Private seller-account details are not required on the public page.
          </p>
        </section>

        <section className="mt-9">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Official reference links
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            Resources for finance and administration teams
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {officialResources.map((resource) => (
              <a
                key={resource.href}
                href={resource.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <span>{resource.label}</span>
                <span aria-hidden="true">↗</span>
              </a>
            ))}
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            These links are provided for planning and verification. RaiseHub does not provide legal or tax advice, and a district or organization may have additional local policies.
          </p>
        </section>

        <section className="mt-9 border-y border-green-200 bg-green-50/70 px-4 py-6 sm:px-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">
            School-managed computers
          </p>
          <h2 className="mt-2 text-2xl font-black text-green-950">
            Give district IT the details they need
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-green-900">
            If RaiseHub is blocked or your district requires vendor approval, the school access page includes domains, browser requirements, privacy links, and support contacts for review.
          </p>
          <Link
            href="/schools/it-access"
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-green-700 px-4 text-sm font-black text-white hover:bg-green-800"
          >
            Open School IT Access →
          </Link>
        </section>
      </div>
    </main>
  )
}
