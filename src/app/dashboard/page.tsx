import { redirect } from 'next/navigation'

// Kept so old bookmarks and the installed PWA keep working.
export default function DashboardRedirectPage() {
  redirect('/inicio')
}
