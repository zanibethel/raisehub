import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export type OrganizationPricingLocation = {
  townName: string | null
  stateCode: string | null
  lookupFailed: boolean
}

export type OrganizationPricingLocationsResult = {
  locationsByOrganizationId: Map<
    string,
    OrganizationPricingLocation
  >
  lookupFailed: boolean
}

export type OrganizationLocatedPricingInput = {
  organizationId?: string | null
  townName?: string | null
  stateCode?: string | null
}

type OrganizationPricingLocationRow = {
  id: string
  town_name: string | null
  state_code: string | null
}

function normalizeTownName(value: string | null) {
  const normalized = value?.trim() ?? ''

  return normalized || null
}

function normalizeStateCode(value: string | null) {
  const normalized = value?.trim().toUpperCase() ?? ''

  return /^[A-Z]{2}$/.test(normalized)
    ? normalized
    : null
}

function createEmptyLocation(
  lookupFailed = false
): OrganizationPricingLocation {
  return {
    townName: null,
    stateCode: null,
    lookupFailed,
  }
}

function mapLocationRow(
  row: OrganizationPricingLocationRow
): OrganizationPricingLocation {
  return {
    townName: normalizeTownName(row.town_name),
    stateCode: normalizeStateCode(row.state_code),
    lookupFailed: false,
  }
}

export async function getOrganizationPricingLocations(
  organizationIds: Array<
    string | null | undefined
  >
): Promise<OrganizationPricingLocationsResult> {
  const normalizedOrganizationIds = [
    ...new Set(
      organizationIds
        .map((organizationId) =>
          organizationId?.trim()
        )
        .filter(
          (
            organizationId
          ): organizationId is string =>
            Boolean(organizationId)
        )
    ),
  ]

  const locationsByOrganizationId =
    new Map<
      string,
      OrganizationPricingLocation
    >(
      normalizedOrganizationIds.map(
        (organizationId) => [
          organizationId,
          createEmptyLocation(),
        ]
      )
    )

  if (normalizedOrganizationIds.length === 0) {
    return {
      locationsByOrganizationId,
      lookupFailed: false,
    }
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('organizations')
    .select('id, town_name, state_code')
    .in('id', normalizedOrganizationIds)

  if (error) {
    for (const organizationId of normalizedOrganizationIds) {
      locationsByOrganizationId.set(
        organizationId,
        createEmptyLocation(true)
      )
    }

    return {
      locationsByOrganizationId,
      lookupFailed: true,
    }
  }

  // The generated database type will be refreshed after the location
  // migration is represented in the checked-in Supabase types.
  const locationRows =
    data as unknown as OrganizationPricingLocationRow[]

  for (const row of locationRows) {
    locationsByOrganizationId.set(
      row.id,
      mapLocationRow(row)
    )
  }

  return {
    locationsByOrganizationId,
    lookupFailed: false,
  }
}

export async function enrichPricingInputsWithOrganizationLocations<
  T extends OrganizationLocatedPricingInput,
>(inputs: T[]): Promise<T[]> {
  const organizationIdsNeedingLocation =
    inputs
      .filter(
        (input) =>
          Boolean(input.organizationId?.trim()) &&
          (!input.townName?.trim() ||
            !input.stateCode?.trim())
      )
      .map((input) => input.organizationId)

  if (organizationIdsNeedingLocation.length === 0) {
    return inputs
  }

  const { locationsByOrganizationId } =
    await getOrganizationPricingLocations(
      organizationIdsNeedingLocation
    )

  return inputs.map((input) => {
    const organizationId =
      input.organizationId?.trim() ?? ''

    if (!organizationId) {
      return input
    }

    const organizationLocation =
      locationsByOrganizationId.get(
        organizationId
      )

    if (!organizationLocation) {
      return input
    }

    return {
      ...input,
      townName:
        input.townName?.trim() ||
        organizationLocation.townName,
      stateCode:
        input.stateCode?.trim() ||
        organizationLocation.stateCode,
    }
  })
}

export async function getOrganizationPricingLocation(
  organizationId: string | null | undefined
): Promise<OrganizationPricingLocation> {
  const normalizedOrganizationId =
    organizationId?.trim() ?? ''

  if (!normalizedOrganizationId) {
    return createEmptyLocation()
  }

  const {
    locationsByOrganizationId,
    lookupFailed,
  } = await getOrganizationPricingLocations([
    normalizedOrganizationId,
  ])

  return (
    locationsByOrganizationId.get(
      normalizedOrganizationId
    ) ?? createEmptyLocation(lookupFailed)
  )
}