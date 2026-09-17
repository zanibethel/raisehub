'use server'

import { revalidatePath } from 'next/cache'

import { resolveCurrentBusinessWorkspace } from '@/lib/services/current-business-workspace-service'
import { createClient } from '@/lib/supabase/server'

type UpdateCanonicalBusinessProfileInput = {
  businessId: string
  businessName: string
  displayName: string
  phone: string
  address: string
  googleMapsUrl: string
  websiteUrl: string
  logoUrl: string
  latitude?: number | null
  longitude?: number | null
}

function clean(value: string) {
  return value.trim() || null
}

function validCoordinate(value: number | null | undefined, min: number, max: number) {
  return value === null || value === undefined ||
    (Number.isFinite(value) && value >= min && value <= max)
}

export async function updateCanonicalBusinessProfileAction(
  input: UpdateCanonicalBusinessProfileInput
) {
  const workspaceResult = await resolveCurrentBusinessWorkspace({
    requireManage: true,
  })

  if (!workspaceResult.success) {
    return { success: false as const, error: workspaceResult.error }
  }

  const { workspace } = workspaceResult
  if (!workspace.canonicalBusinessId || workspace.canonicalBusinessId !== input.businessId) {
    return {
      success: false as const,
      error: 'The selected business workspace changed. Reopen the profile editor and try again.',
    }
  }

  const businessName = input.businessName.trim()
  const displayName = input.displayName.trim()
  if (!businessName && !displayName) {
    return { success: false as const, error: 'Add a business name before saving.' }
  }

  if (!validCoordinate(input.latitude, -90, 90) || !validCoordinate(input.longitude, -180, 180)) {
    return { success: false as const, error: 'The captured business location is invalid.' }
  }

  const now = new Date().toISOString()
  const publicName = displayName || businessName
  const supabase = await createClient()

  const businessUpdate = {
    name: publicName,
    legal_name: businessName || publicName,
    phone: clean(input.phone),
    address: clean(input.address),
    google_maps_url: clean(input.googleMapsUrl),
    website_url: clean(input.websiteUrl),
    logo_url: clean(input.logoUrl),
    updated_at: now,
    ...(input.latitude !== null &&
    input.latitude !== undefined &&
    input.longitude !== null &&
    input.longitude !== undefined
      ? {
          latitude: input.latitude,
          longitude: input.longitude,
          location_source: 'current_location',
          location_updated_at: now,
        }
      : {}),
  }

  const { error: businessError } = await (supabase as any)
    .from('businesses')
    .update(businessUpdate)
    .eq('id', workspace.canonicalBusinessId)

  if (businessError) {
    return { success: false as const, error: businessError.message }
  }

  if (workspace.legacyProfileId) {
    const { error: profileError } = await (supabase as any)
      .from('profiles')
      .update({
        business_name: businessName || publicName,
        display_name: publicName,
        phone: clean(input.phone),
        address: clean(input.address),
        google_maps_url: clean(input.googleMapsUrl),
        website_url: clean(input.websiteUrl),
        logo_url: clean(input.logoUrl),
      })
      .eq('id', workspace.legacyProfileId)

    if (profileError) {
      return {
        success: false as const,
        error: `Business workspace saved, but the legacy profile could not be synchronized: ${profileError.message}`,
      }
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/offers')
  revalidatePath('/dashboard/rewards')
  revalidatePath('/dashboard/reports')

  return { success: true as const }
}
