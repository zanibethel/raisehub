'use server'

import { revalidatePath } from 'next/cache'

import { createDemoGroup } from '@/lib/repositories/demo-platform-repository'
import { createClient } from '@/lib/supabase/server'

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

function failure(
  message: string
): CreateDemoGroupActionState {
  return {
    success: false,
    message,
    groupKey: null,
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

// =============================================================================
// Actions
// =============================================================================

export async function createDemoGroupAction(
  _previousState: CreateDemoGroupActionState,
  formData: FormData
): Promise<CreateDemoGroupActionState> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return failure(
      'Sign in before creating a demo group.'
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

  const result = await createDemoGroup({
    name: readFormValue(formData, 'name'),
    description:
      readFormValue(formData, 'description'),
    scenarioType:
      readFormValue(formData, 'scenarioType'),
  })

  if (result.error || !result.group) {
    return failure(
      result.error ??
        'The demo group could not be created.'
    )
  }

  revalidatePath('/dashboard/owner/demos')
  revalidatePath(
    `/dashboard/owner/demo-groups/${result.group.groupKey}`
  )

  return {
    success: true,
    message: `${result.group.name} was created.`,
    groupKey: result.group.groupKey,
  }
}
