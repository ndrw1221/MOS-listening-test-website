'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { deleteProject } from '@/actions/admin'
import { Trash2 } from 'lucide-react'

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter()

  const handleDelete = async () => {
    await deleteProject(projectId)
    router.push('/admin')
    router.refresh()
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive" title="Delete Project">
          <Trash2 className="w-4 h-4" />
        </Button>
      }
      title="Delete Project?"
      description="This will permanently delete the project, all its questionnaires, prompts, audio files, and responses. This action cannot be undone."
      confirmLabel="Delete Project"
      onConfirm={handleDelete}
    />
  )
}
