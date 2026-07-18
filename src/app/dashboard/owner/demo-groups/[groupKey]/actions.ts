'use server'

import { revalidatePath } from 'next/cache'

import {
  createPortableDemoProfile,
  type DemoProfileRole,
} from '@/lib/repositories/demo-profile-management-repository'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

export type CreateDemoProfileActionState = {
  success: boolean
  message: string | null
}

// =============================================================================
// Helpers
// =============================================================================

function failure(
  message: string
): CreateDemoProfileActionState {
  return {
    success: false,
    message,
  }
}

function readFormValue(
  formData: FormData,
  key: string
) {
  const value = formData.get(key)

  return typeof value === 'string'
    ? value
    : ''
}

function readCheckbox(
  formData: FormData,
  key: string
) {
  return formData.get(key) === 'on'
}

function isDemoProfileRole(
  value: string
): value is DemoProfileRole {
  return [
    'customer',
    'business',
    'organization',
    'admin',
    'owner',
    'support',
  ].includes(value)
}

// =============================================================================
// Action
// =============================================================================

export async function createDemoProfileAction(
  _previousState: CreateDemoProfileActionState,
  formData: FormData
): Promise<CreateDemoProfileActionState> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return failure(
      'Sign in before creating a demo profile.'
    )
  }

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: string }>()

  if (profileError || !profile) {
    return failure(
      'Unable to verify owner access.'
    )
  }

  if (profile.role !== 'owner') {
    return failure(
      'Owner access is required.'
    )
  }

  const groupKey =
    readFormValue(formData, 'groupKey')

  const label =
    readFormValue(formData, 'label')

  const roleValue =
    readFormValue(formData, 'role')

  if (!isDemoProfileRole(roleValue)) {
    return failure(
      'Choose a valid demo profile role.'
    )
  }

  const result =
    await createPortableDemoProfile({
      groupKey,
      label,
      role: roleValue,
      isPrimary:
        readCheckbox(formData, 'isPrimary'),
    })

  if (result.error || !result.profile) {
    return failure(
      result.error ??
        'The demo profile could not be created.'
    )
  }

  revalidatePath(
    `/dashboard/owner/demo-groups/${groupKey}`
  )

  revalidatePath('/dashboard/owner/demos')

  return {
    success: true,
    message: `${result.profile.label} was created.`,
  }
}
