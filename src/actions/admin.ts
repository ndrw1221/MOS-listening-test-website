'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getProjects() {
  const supabase = await createClient()
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
    return []
  }
  return projects
}

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const title = formData.get('title') as string
  const description = formData.get('description') as string

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('projects')
    .insert([
      { title, description, user_id: user.id }
    ])
    .select()

  if (error) {
    console.error('Error creating project:', error)
    throw new Error(error.message)
  }

  revalidatePath('/admin')
  return data[0]
}

export async function getProject(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw new Error(error.message)
  return data
}

export async function updateProject(id: string, updates: any) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
  
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/projects/${id}`)
}

export async function getQuestionnaires(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('questionnaires')
    .select(`
      *,
      prompts (
        *,
        audio_variants (*)
      )
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
    .order('order_index', { ascending: true, referencedTable: 'prompts' })

  if (error) throw new Error(error.message)
  return data
}

export async function createQuestionnaire(projectId: string, title: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('questionnaires')
    .insert([{ project_id: projectId, title }])
    .select()
  
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/projects/${projectId}`)
  return data[0]
}

export async function createPrompt(questionnaireId: string, text: string, type: string = 'audio', options: string[] | null = null) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('prompts')
    .insert([{ questionnaire_id: questionnaireId, text, type, options }])
    .select()

  if (error) throw new Error(error.message)
  return data[0]
}

export async function createAudioVariant(promptId: string, modelName: string, fileUrl: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('audio_variants')
    .insert([{ prompt_id: promptId, model_name: modelName, file_url: fileUrl }])
    .select()

  if (error) throw new Error(error.message)
  return data[0]
}

export async function getProjectResponses(projectId: string) {
  const supabase = await createClient()
  let allData: any[] = []
  let from = 0
  const limit = 1000
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('responses')
      .select(`
        *,
        questionnaires!inner(project_id),
        prompts (text),
        audio_variants (model_name)
      `)
      .eq('questionnaires.project_id', projectId)
      .order('created_at', { ascending: true })
      .range(from, from + limit - 1)
    
    if (error) throw new Error(error.message)
    
    if (data && data.length > 0) {
      allData = [...allData, ...data]
      from += data.length
      
      if (data.length < limit) {
        hasMore = false
      }
    } else {
      hasMore = false
    }
  }

  return allData
}

export async function deleteProject(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

export async function deleteQuestionnaire(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('questionnaires').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/projects/${projectId}`)
}

export async function deletePrompt(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('prompts').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/projects/${projectId}`)
}

export async function updatePrompt(id: string, updates: any, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('prompts').update(updates).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/projects/${projectId}`)
}

export async function deleteAudioVariant(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('audio_variants').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/projects/${projectId}`)
}

export async function deleteSession(sessionId: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('responses').delete().eq('session_id', sessionId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/projects/${projectId}`)
}

export async function updatePromptOrders(updates: { id: string; order_index: number }[]) {
  const supabase = await createClient()
  // Update each prompt's order_index individually
  for (const update of updates) {
    const { error } = await supabase
      .from('prompts')
      .update({ order_index: update.order_index })
      .eq('id', update.id)
    if (error) throw new Error(error.message)
  }
}
