export type OrganizationComplianceProfile = {
  legalEntityName: string | null
  taxIdLast4: string | null
  taxExemptStatus: string | null
  authorizationStatus: string | null
  authorizationContactName: string | null
  authorizationContactRole: string | null
  authorizationContactEmail: string | null
  updatedAt: string | null
}

export type OrganizationComplianceSnapshot = {
  version: 1
  capturedAt: string
  organizationName: string | null
  organizationType: string | null
  townName: string | null
  stateCode: string | null
  legalEntityName: string | null
  taxIdLast4: string | null
  taxExemptStatus: string | null
  authorizationStatus: string | null
  authorizationContactName: string | null
  authorizationContactRole: string | null
  authorizationContactEmail: string | null
}

export const ORGANIZATION_TYPE_OPTIONS = [
  ['school_district', 'Public school or district'],
  ['school_sponsored_group', 'School-sponsored club or team'],
  ['pta_pto', 'PTA / PTO'],
  ['booster_club', 'Booster club'],
  ['nonprofit', 'Independent nonprofit'],
  ['sports_team', 'Sports team'],
  ['club', 'Club'],
  ['church', 'Church or faith organization'],
  ['community_group', 'Community group'],
  ['other', 'Other'],
] as const

export const TAX_EXEMPT_STATUS_OPTIONS = [
  ['not_provided', 'Not provided'],
  ['not_claimed', 'Not claiming tax-exempt status'],
  ['pending', 'Status pending / being confirmed'],
  ['organization_reported_exempt', 'Organization reports tax-exempt status'],
] as const

export const AUTHORIZATION_STATUS_OPTIONS = [
  ['not_provided', 'Not provided'],
  ['not_required', 'Not required for this organization'],
  ['pending', 'Approval / authorization pending'],
  ['organization_confirmed', 'Confirmed by organization'],
  ['school_confirmed', 'Confirmed by school or campus'],
  ['district_confirmed', 'Confirmed by district'],
] as const

const SCHOOL_RELATED_TYPES = new Set([
  'school_district',
  'school_sponsored_group',
  'pta_pto',
  'booster_club',
  'school',
])

function cleanText(value: unknown, maxLength = 320) {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maxLength)
    : null
}

function cleanTaxIdLast4(value: unknown) {
  if (typeof value !== 'string') return null
  const digits = value.replace(/\D/g, '').slice(-4)
  return digits.length === 4 ? digits : null
}

export function normalizeOrganizationComplianceProfile(
  value: unknown
): OrganizationComplianceProfile {
  const record =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}

  return {
    legalEntityName: cleanText(record.legalEntityName, 200),
    taxIdLast4: cleanTaxIdLast4(record.taxIdLast4),
    taxExemptStatus: cleanText(record.taxExemptStatus, 80),
    authorizationStatus: cleanText(record.authorizationStatus, 80),
    authorizationContactName: cleanText(record.authorizationContactName, 160),
    authorizationContactRole: cleanText(record.authorizationContactRole, 120),
    authorizationContactEmail: cleanText(record.authorizationContactEmail, 320),
    updatedAt: cleanText(record.updatedAt, 80),
  }
}

export function serializeOrganizationComplianceProfile(
  input: Omit<OrganizationComplianceProfile, 'updatedAt'>,
  updatedAt = new Date().toISOString()
): OrganizationComplianceProfile {
  return {
    legalEntityName: cleanText(input.legalEntityName, 200),
    taxIdLast4: cleanTaxIdLast4(input.taxIdLast4),
    taxExemptStatus: cleanText(input.taxExemptStatus, 80),
    authorizationStatus: cleanText(input.authorizationStatus, 80),
    authorizationContactName: cleanText(input.authorizationContactName, 160),
    authorizationContactRole: cleanText(input.authorizationContactRole, 120),
    authorizationContactEmail: cleanText(input.authorizationContactEmail, 320),
    updatedAt,
  }
}

export function getOrganizationComplianceCompleteness({
  organizationType,
  profile,
}: {
  organizationType: string | null | undefined
  profile: OrganizationComplianceProfile
}) {
  const recommended: Array<[string, boolean]> = [
    ['Organization type', Boolean(organizationType?.trim())],
    ['Legal entity name', Boolean(profile.legalEntityName)],
    ['Tax-exempt status', Boolean(profile.taxExemptStatus && profile.taxExemptStatus !== 'not_provided')],
  ]

  if (
    profile.taxExemptStatus === 'pending' ||
    profile.taxExemptStatus === 'organization_reported_exempt'
  ) {
    recommended.push(['Tax ID last four', Boolean(profile.taxIdLast4)])
  }

  if (SCHOOL_RELATED_TYPES.has(organizationType?.trim() ?? '')) {
    recommended.push([
      'School or district authorization status',
      Boolean(profile.authorizationStatus && profile.authorizationStatus !== 'not_provided'),
    ])

    if (
      profile.authorizationStatus &&
      profile.authorizationStatus !== 'not_provided' &&
      profile.authorizationStatus !== 'not_required'
    ) {
      recommended.push(
        ['Authorization contact name', Boolean(profile.authorizationContactName)],
        ['Authorization contact role', Boolean(profile.authorizationContactRole)],
        ['Authorization contact email', Boolean(profile.authorizationContactEmail)]
      )
    }
  }

  return {
    completed: recommended.filter(([, done]) => done).length,
    total: recommended.length,
    missing: recommended.filter(([, done]) => !done).map(([label]) => label),
  }
}

export function maskTaxIdLast4(value: string | null | undefined) {
  const digits = cleanTaxIdLast4(value)
  return digits ? `**-***${digits}` : 'Not provided'
}

export function buildOrganizationComplianceSnapshot({
  organizationName,
  organizationType,
  townName,
  stateCode,
  complianceProfile,
  capturedAt = new Date().toISOString(),
}: {
  organizationName: string | null | undefined
  organizationType: string | null | undefined
  townName: string | null | undefined
  stateCode: string | null | undefined
  complianceProfile: unknown
  capturedAt?: string
}): OrganizationComplianceSnapshot {
  const profile = normalizeOrganizationComplianceProfile(complianceProfile)

  return {
    version: 1,
    capturedAt,
    organizationName: cleanText(organizationName, 160),
    organizationType: cleanText(organizationType, 80),
    townName: cleanText(townName, 120),
    stateCode: cleanText(stateCode, 2)?.toUpperCase() ?? null,
    legalEntityName: profile.legalEntityName,
    taxIdLast4: profile.taxIdLast4,
    taxExemptStatus: profile.taxExemptStatus,
    authorizationStatus: profile.authorizationStatus,
    authorizationContactName: profile.authorizationContactName,
    authorizationContactRole: profile.authorizationContactRole,
    authorizationContactEmail: profile.authorizationContactEmail,
  }
}
