export default function HomePage() {
  return (
    <main className="min-h-screen bg-white p-8 text-gray-900">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          RaiseHub
        </h1>

        <p className="mt-4 max-w-2xl text-lg text-gray-600">
          Raise money for schools and organizations while promoting local businesses.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border p-5 shadow-sm">
            <h2 className="text-lg font-semibold">For schools</h2>
            <p className="mt-2 text-sm text-gray-600">
              Launch digital fundraising passes supporters can buy online.
            </p>
          </div>

          <div className="rounded-2xl border p-5 shadow-sm">
            <h2 className="text-lg font-semibold">For businesses</h2>
            <p className="mt-2 text-sm text-gray-600">
              Promote local offers, attract customers, and track redemptions.
            </p>
          </div>

          <div className="rounded-2xl border p-5 shadow-sm">
            <h2 className="text-lg font-semibold">For supporters</h2>
            <p className="mt-2 text-sm text-gray-600">
              Buy a pass, save money locally, and support a fundraiser at the same time.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}