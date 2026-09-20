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

export default function SchoolsPage() {
  return (
    <main className="min-h-screen bg-[#F0F6FF] px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            RaiseHub for schools
          </p>
          <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-5xl">
            Fundraising that works with the way schools actually operate
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
            RaiseHub can support district-controlled school groups, student clubs, PTAs, PTOs,
            booster clubs, teams, and other community organizations. The important first step is
            identifying which legal or school entity is actually running the fundraiser so the
            account, payout information, and approvals match the right organization.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup/organization"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              Start an organization account
            </Link>
            <Link
              href="/schools/it-access"
              className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100"
            >
              School IT & vendor access
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
              School or district-controlled group
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              Use the entity your district authorizes
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              A teacher, sponsor, coach, or campus club should coordinate with the district or
              campus finance office before entering payout information. RaiseHub will not tell a
              school-controlled group to create a separate EIN simply to open a fundraiser.
            </p>
          </article>

          <article className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
              PTA or PTO
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              Use the parent organization&apos;s own legal identity
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Texas generally treats PTAs and PTOs separately from the school&apos;s exempt status.
              If the parent organization claims an exemption, use the organization&apos;s own
              approved records rather than the school&apos;s tax identity.
            </p>
          </article>

          <article className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-violet-700">
              Booster club
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              Keep booster finances separate from the school
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Texas does not automatically extend a school&apos;s exempt status to a booster club.
              The booster club should use its own legal, tax, and payout information when it is the
              fundraiser owner.
            </p>
          </article>

          <article className="rounded-3xl border border-amber-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">
              Other nonprofit or community group
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              Match RaiseHub to the real organization
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Use the organization that is actually authorized to receive the fundraiser proceeds.
              An EIN identifies an organization, but an EIN by itself does not establish that the
              organization is tax-exempt.
            </p>
          </article>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Student and seller participation
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Student accounts are optional
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            An organization can add seller, student, or participant display names to a campaign
            roster and generate an individual link and QR code for each person. A student does not
            need an email address or RaiseHub account for that managed roster entry to receive
            campaign credit.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-blue-50 p-5">
              <h3 className="font-black text-blue-950">Organization-managed seller</h3>
              <p className="mt-2 text-sm leading-6 text-blue-900">
                The organizer creates the roster entry, prints or shares the QR code, and can view
                seller totals. This is the preferred low-data path for younger students.
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-5">
              <h3 className="font-black text-emerald-950">Optional seller account</h3>
              <p className="mt-2 text-sm leading-6 text-emerald-900">
                A seller who is permitted to create an account can claim their roster entry, keep
                the same referral history, see their own results, update their seller profile, and
                retrieve their personal link or QR code again later.
              </p>
            </div>
          </div>

          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            For children under 13, use the organization-managed roster by default. Do not direct a
            child to create their own RaiseHub account unless the school or organization has
            confirmed the appropriate parent or school authorization for that use.
          </p>
        </section>

        <section className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
            Public seller links
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Every seller QR code opens the fundraiser, not a student-data page
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            A seller QR code opens the public campaign purchase page with that seller&apos;s
            attribution already attached. Supporters can see overall fundraiser progress and the
            seller&apos;s public progress, then purchase a pass or buy a separate pass as a gift.
            Private seller-account details are not required on the public page.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Texas reference links
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Official resources for your finance or administration team
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {officialResources.map((resource) => (
              <a
                key={resource.href}
                href={resource.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-blue-700 hover:border-blue-200 hover:bg-blue-50"
              >
                {resource.label} ↗
              </a>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-slate-500">
            These links are provided for planning and verification. RaiseHub does not provide legal
            or tax advice, and a district or organization may have additional local policies.
          </p>
        </section>

        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
          <h2 className="text-2xl font-black text-emerald-950">
            Using a school-managed computer?
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-900">
            If RaiseHub is blocked or your district requires vendor approval, send your IT team our
            school access page. It includes the domains, browser requirements, privacy links, and
            support contacts they need for review.
          </p>
          <Link
            href="/schools/it-access"
            className="mt-5 inline-flex rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"
          >
            Open School IT Access →
          </Link>
        </section>
      </div>
    </main>
  )
}
