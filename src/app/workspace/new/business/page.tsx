import { redirect } from 'next/navigation'

import CreateWorkspaceForm from '@/components/workspaces/create-workspace-form'
import { createClient } from '@/lib/supabase/server'

export default async function NewBusinessWorkspacePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signup/business')
  }

  return <CreateWorkspaceForm kind="business" />
}
