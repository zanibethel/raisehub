'use server'

import { revalidatePath } from 'next/cache'

import {
  isRedemptionMethod,
  isRedemptionMethodAvailable,
  type RedemptionMethod,
} from '@/lib/redemptions/redemption-method'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Result contract
// =============================================================================

export type UpdateBusinessRedemptionMethodResult =
  | {
      success: true
      redemptionMethod: RedemptionMethod
    }
  | {
      success: false
      error: string
    }

// =============================================================================
// Error helpers
// =============================================================================

type SupabaseMutationError = {
  code?: string | null
  message?: string | null
}

function isMissingRedemptionMethodColumn(
  error: SupabaseMutationError | null
): boolean {
  if (!error) return false

  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    error.message
      ?.toLowerCase()
      .includes('redemption_method') === true
  )
}

// =============================================================================
// Save action
// =============================================================================

export async function updateBusinessRedemptionMethodAction(
  value: unknown
): Promise<UpdateBusinessRedemptionMethodResult> {
  if (!isRedemptionMethod(value)) {
    return {
      success: false,
      error:
        'Choose a valid redemption method.',
    }
  }

  if (!isRedemptionMethodAvailable(value)) {
    return {
      success: false,
      error:
        'That redemption method is still planned and cannot be selected yet.',
    }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      error:
        'You must be logged in to update redemption settings.',
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      redemption_method: value,
    })
    .eq('id', user.id)

  if (error) {
    if (isMissingRedemptionMethodColumn(error)) {
      return {
        success: false,
        error:
          'Redemption settings are not available yet because the required database update has not been applied.',
      }
    }

    return {
      success: false,
      error:
        'Could not update your redemption method. Please try again.',
    }
  }

  revalidatePath('/dashboard')

  return {
    success: true,
    redemptionMethod: value,
  }
}