'use server'

import { createClient } from '@/lib/supabase/server'

export async function getProjectForSurvey(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*, questionnaires(id)')
    .eq('id', projectId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getQuestionnaireData(questionnaireId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('questionnaires')
    .select(`
      *,
      projects ( title, description, criteria_settings ),
      prompts (
        *,
        audio_variants (*)
      )
    `)
    .eq('id', questionnaireId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function submitResponse(
  sessionId: string,
  questionnaireId: string,
  promptId: string,
  variantId: string | null,
  scores: any
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('responses')
    .insert([
      {
        session_id: sessionId,
        questionnaire_id: questionnaireId,
        prompt_id: promptId,
        variant_id: variantId,
        criteria_scores: scores
      }
    ])

  if (error) throw new Error(error.message)
}
