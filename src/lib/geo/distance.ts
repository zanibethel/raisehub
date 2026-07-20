// =============================================================================
// Types
// =============================================================================

export type GeographicCoordinates = {
  latitude: number
  longitude: number
}

// =============================================================================
// Constants
// =============================================================================

const EARTH_RADIUS_MILES = 3958.8

// =============================================================================
// Validation
// =============================================================================

export function isValidLatitude(
  latitude: number
): boolean {
  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90
  )
}

export function isValidLongitude(
  longitude: number
): boolean {
  return (
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  )
}

export function hasValidCoordinates(
  coordinates:
    | GeographicCoordinates
    | null
    | undefined
): coordinates is GeographicCoordinates {
  if (!coordinates) {
    return false
  }

  return (
    isValidLatitude(coordinates.latitude) &&
    isValidLongitude(coordinates.longitude)
  )
}

// =============================================================================
// Conversion helpers
// =============================================================================

function degreesToRadians(
  degrees: number
): number {
  return degrees * (Math.PI / 180)
}

// =============================================================================
// Distance calculation
// =============================================================================

export function calculateDistanceMiles(
  origin: GeographicCoordinates,
  destination: GeographicCoordinates
): number | null {
  if (
    !hasValidCoordinates(origin) ||
    !hasValidCoordinates(destination)
  ) {
    return null
  }

  const originLatitude =
    degreesToRadians(origin.latitude)

  const destinationLatitude =
    degreesToRadians(destination.latitude)

  const latitudeDifference =
    degreesToRadians(
      destination.latitude - origin.latitude
    )

  const longitudeDifference =
    degreesToRadians(
      destination.longitude - origin.longitude
    )

  const haversineValue =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDifference / 2) ** 2

  const angularDistance =
    2 *
    Math.atan2(
      Math.sqrt(haversineValue),
      Math.sqrt(1 - haversineValue)
    )

  return EARTH_RADIUS_MILES * angularDistance
}

// =============================================================================
// Display helpers
// =============================================================================

export function formatDistanceMiles(
  distanceMiles: number | null
): string | null {
  if (
    distanceMiles === null ||
    !Number.isFinite(distanceMiles) ||
    distanceMiles < 0
  ) {
    return null
  }

  if (distanceMiles < 0.1) {
    return 'Less than 0.1 mi'
  }

  if (distanceMiles < 10) {
    return `${distanceMiles.toFixed(1)} mi`
  }

  return `${Math.round(distanceMiles)} mi`
}