import { getProject, getQuestionnaires, updateProject } from '@/actions/admin'
import { QuestionnaireBuilder } from '@/components/admin/QuestionnaireBuilder'
import { ResultsDashboard } from '@/components/admin/ResultsDashboard'
import { CopyLinkButton } from '@/components/admin/CopyLinkButton'
import { DeleteProjectButton } from '@/components/admin/DeleteProjectButton'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { revalidatePath } from 'next/cache'

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  const project = await getProject(resolvedParams.id)
  const questionnaires = await getQuestionnaires(resolvedParams.id)

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900 flex items-center mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.title}</h1>
            <p className="text-gray-500 mt-1">{project.description || 'No description'}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <form action={async () => {
              'use server'
              await updateProject(project.id, { is_published: !project.is_published })
            }}>
              <Button type="submit" variant={project.is_published ? "outline" : "default"}>
                <Globe className="w-4 h-4 mr-2" />
                {project.is_published ? 'Unpublish Project' : 'Publish Project'}
              </Button>
            </form>
            
            <Link href={`/survey/${project.id}?preview=true`} target="_blank">
              <Button variant="secondary" title="Preview Survey">
                <ExternalLink className="w-4 h-4 mr-2" />
                Preview Survey
              </Button>
            </Link>
            <DeleteProjectButton projectId={project.id} />

            {project.is_published && (
              <CopyLinkButton projectId={project.id} />
            )}
          </div>
        </div>
      </div>

      <ResultsDashboard projectId={project.id} criteriaList={project.criteria_settings} />

      <QuestionnaireBuilder project={project} initialQuestionnaires={questionnaires} />
    </div>
  )
}
