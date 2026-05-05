'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { logout } from '@/actions/auth'
import { Loader2 } from 'lucide-react'

export function LogoutButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await logout()
      router.push('/admin/login')
      router.refresh()
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout} disabled={isPending}>
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Logout'}
    </Button>
  )
}
