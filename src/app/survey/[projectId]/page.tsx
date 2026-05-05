import { getProjectForSurvey } from '@/actions/survey'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function SurveyRoutingPage({ params, searchParams }: { params: Promise<{ projectId: string }>, searchParams: Promise<{ preview?: string }> }) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const project = await getProjectForSurvey(resolvedParams.projectId)

  let isPreview = false
  if (resolvedSearchParams.preview === 'true') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) isPreview = true
  }

  if (!project.is_published && !isPreview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white shadow rounded-lg">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Project Not Available</h1>
          <p className="text-gray-500">This listening test is not currently active.</p>
        </div>
      </div>
    )
  }

  const questionnaires = project.questionnaires
  if (!questionnaires || questionnaires.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white shadow rounded-lg">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Questionnaires Found</h1>
          <p className="text-gray-500">This project has no active questionnaires.</p>
        </div>
      </div>
    )
  }

  // Random assignment logic
  const randomIndex = Math.floor(Math.random() * questionnaires.length)
  const assignedQuestionnaire = questionnaires[randomIndex]

  redirect(`/survey/${resolvedParams.projectId}/${assignedQuestionnaire.id}`)
}
