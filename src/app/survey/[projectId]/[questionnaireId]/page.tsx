import { getQuestionnaireData } from '@/actions/survey'
import { SurveyLayout } from '@/components/survey/SurveyLayout'

export default async function QuestionnairePage({ params }: { params: Promise<{ projectId: string, questionnaireId: string }> }) {
  const resolvedParams = await params
  const data = await getQuestionnaireData(resolvedParams.questionnaireId)

  // Keep prompts in their defined order (sorted by order_index, then created_at)
  const prompts = [...(data.prompts || [])].sort((a, b) => {
    if (a.order_index !== b.order_index) return a.order_index - b.order_index
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
  
  // Shuffle audio variants within each prompt to hide model identity
  const processedPrompts = prompts.map(prompt => ({
    ...prompt,
    audio_variants: [...(prompt.audio_variants || [])].sort(() => Math.random() - 0.5)
  }))

  return (
    <SurveyLayout 
      project={data.projects} 
      questionnaireId={data.id} 
      prompts={processedPrompts} 
    />
  )
}
