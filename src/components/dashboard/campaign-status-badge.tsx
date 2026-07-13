import StatusBadge from '@/components/dashboard/status-badge'

type CampaignStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived'

type CampaignStatusBadgeProps = {
  status: string
}

function normalizeStatus(status: string): CampaignStatus {
  switch (status.toLowerCase()) {
    case 'active':
    case 'paused':
    case 'completed':
    case 'archived':
    case 'draft':
      return status.toLowerCase() as CampaignStatus
    default:
      return 'draft'
  }
}

function getLabel(status: CampaignStatus): string {
  switch (status) {
    case 'active':
      return 'Active'
    case 'paused':
      return 'Paused'
    case 'completed':
      return 'Completed'
    case 'archived':
      return 'Archived'
    case 'draft':
    default:
      return 'Draft'
  }
}

export default function CampaignStatusBadge({
  status,
}: CampaignStatusBadgeProps) {
  const normalized = normalizeStatus(status)

  return (
    <StatusBadge
      label={getLabel(normalized)}
      status={normalized}
    />
  )
}
