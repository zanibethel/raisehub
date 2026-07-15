'use server'

import { revalidatePath } from 'next/cache'

import { createDemoGroup } from '@/lib/repositories/demo-platform-repository'

// =============================================================================
// Types
// =============================================================================

export type CreateDemoGroupActionState = {
  success: boolean
  message: string | null
  groupKey: string | null
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

// =============================================================================
// Actions
// =============================================================================

export async function createDemoGroupAction(
  _previousState: CreateDemoGroupActionState,
  formData: FormData
): Promise<CreateDemoGroupActionState> {
  const result = await createDemoGroup({
    name: readFormValue(formData, 'name'),
    description:
      readFormValue(formData, 'description'),
    scenarioType:
      readFormValue(formData, 'scenarioType'),
  })

  if (result.error || !result.group) {
    return {
      success: false,
      message:
        result.error ??
        'The demo group could not be created.',
      groupKey: null,
    }
  }

  revalidatePath('/dashboard/owner')
  revalidatePath(
    `/dashboard/owner/demo-groups/${result.group.groupKey}`
  )

  return {
    success: true,
    message: `${result.group.name} was created.`,
    groupKey: result.group.groupKey,
  }
}
