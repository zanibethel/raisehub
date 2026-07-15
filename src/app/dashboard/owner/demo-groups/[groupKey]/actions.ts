'use server'

import { revalidatePath } from 'next/cache'

import {
  createPortableDemoProfile,
  type DemoProfileRole,
} from '@/lib/repositories/demo-profile-management-repository'

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
  const groupKey =
    readFormValue(formData, 'groupKey')

  const label =
    readFormValue(formData, 'label')

  const roleValue =
    readFormValue(formData, 'role')

  if (!isDemoProfileRole(roleValue)) {
    return {
      success: false,
      message: 'Choose a valid demo profile role.',
    }
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
    return {
      success: false,
      message:
        result.error ??
        'The demo profile could not be created.',
    }
  }

  revalidatePath(
    `/dashboard/owner/demo-groups/${groupKey}`
  )

  revalidatePath('/dashboard/owner')

  return {
    success: true,
    message: `${result.profile.label} was created.`,
  }
}
