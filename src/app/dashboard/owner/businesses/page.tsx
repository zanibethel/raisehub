import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Manage Businesses | RaiseHub Owner Console',
}

export default function OwnerBusinessesPage() {
  redirect('/dashboard/owner/support?workspaceRole=business')
}
