import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/admin/LogoutButton'
import Link from 'next/link'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/admin" className="font-semibold text-lg flex items-center gap-2">
            MOS Platform <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Admin</span>
          </Link>
          
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 hidden sm:inline-block">{user.email}</span>
              <LogoutButton />
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
