import OwnerRoleSwitcher, {
  type PreviewRole,
} from './owner-role-switcher'

// =============================================================================
// Types
// =============================================================================

type OwnerDashboardContentProps = {
  activeRole: PreviewRole
}

// =============================================================================
// Component
// =============================================================================

export default function OwnerDashboardContent({
  activeRole,
}: OwnerDashboardContentProps) {
  return (
    <div className="mt-8 space-y-8">
      <OwnerRoleSwitcher activeRole={activeRole} />

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
          Owner access
        </p>

        <h2 className="mt-2 text-xl font-bold text-blue-950">
          Previewing the {activeRole} experience
        </h2>

        <p className="mt-2 text-sm leading-6 text-blue-900">
          Your permanent profile remains an owner account. Changing the
          selected role only changes which dashboard experience is being
          previewed.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Demo preview
          </p>

          <h3 className="mt-2 text-lg font-bold text-slate-900">
            Test every role
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Review customer, business, organization, and admin experiences
            without changing your saved owner role.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Client support
          </p>

          <h3 className="mt-2 text-lg font-bold text-slate-900">
            View live accounts
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Search for a business or organization and inspect its dashboard in
            read-only support mode.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Assisted editing
          </p>

          <h3 className="mt-2 text-lg font-bold text-slate-900">
            Help clients safely
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Future assisted changes will record your owner account, the client
            account, the resource changed, and the support reason.
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6">
        <h2 className="font-bold text-yellow-950">
          Live support editing is not enabled yet
        </h2>

        <p className="mt-2 text-sm leading-6 text-yellow-900">
          The database foundation and owner identity are ready. Account
          selection, secure preview mapping, explicit edit mode, and audit
          logging will be connected in the next steps.
        </p>
      </section>
    </div>
  )
}