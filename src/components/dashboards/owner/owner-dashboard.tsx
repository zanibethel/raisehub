import OwnerDashboardContent from './owner-dashboard-content'

export type PreviewRole =
  | 'customer'
  | 'business'
  | 'organization'
  | 'admin'

type Props = {
  searchParams?: {
    previewRole?: string
  }
}

const VALID_ROLES: PreviewRole[] = [
  'customer',
  'business',
  'organization',
  'admin',
]

export default async function OwnerDashboard({
  searchParams,
}: Props) {
  const previewRole = VALID_ROLES.includes(
    searchParams?.previewRole as PreviewRole
  )
    ? (searchParams!.previewRole as PreviewRole)
    : 'customer'

  return (
    <OwnerDashboardContent
      activeRole={previewRole}
    />
  )
}