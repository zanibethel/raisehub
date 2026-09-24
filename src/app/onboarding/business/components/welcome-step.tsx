export default function WelcomeStep() {
  return (
    <div className="text-left">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">
        Welcome, Community Partner
      </p>

      <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
        Let’s build your RaiseHub profile
      </h1>

      <p className="mt-4 max-w-xl leading-7 text-slate-600">
        Set up your business profile, choose how customers redeem offers, and
        tell us which checkout system you currently use.
      </p>

      <div className="mt-8 max-w-lg border-l-4 border-green-500 pl-4">
        <p className="font-semibold text-green-800">
          Your free Community Partner account includes:
        </p>

        <ul className="mt-4 space-y-3 text-sm text-gray-700">
          <li>✓ A public business profile</li>
          <li>✓ Up to 3 active exclusive offers</li>
          <li>✓ Support for local organizations</li>
          <li>✓ Basic redemption and impact tracking</li>
        </ul>
      </div>

      <p className="mt-6 max-w-lg text-sm leading-6 text-slate-500">
        You can update these details later from your business dashboard.
      </p>
    </div>
  )
}
