'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PlusCircle, Trash2, Edit2, Check, GripVertical, ChevronDown, ChevronRight } from 'lucide-react'
import {
  createQuestionnaire,
  createPrompt,
  deleteQuestionnaire,
  deletePrompt,
  updatePrompt,
  updatePromptOrders,
} from '@/actions/admin'
import { AudioUploader } from './AudioUploader'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// ── Sortable Block Row ─────────────────────────────────────────────────────────
function SortableBlock({
  prompt,
  qId,
  projectId,
  editingPrompt,
  onEditStart,
  onEditSave,
  onEditChange,
  onDelete,
}: {
  prompt: any
  qId: string
  projectId: string
  editingPrompt: { id: string; text: string; options?: string[] | null } | null
  onEditStart: (p: { id: string; text: string; options?: string[] | null }) => void
  onEditSave: (qId: string, promptId: string) => void
  onEditChange: (text: string) => void
  onDelete: (qId: string, promptId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: prompt.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white p-4 rounded-md border shadow-sm space-y-4 relative group"
    >
      {/* Drag handle + action buttons */}
      <div className="absolute top-2 right-2 flex gap-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEditStart({ id: prompt.id, text: prompt.text, options: prompt.options })}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
              <Trash2 className="w-4 h-4" />
            </Button>
          }
          title="Delete this block?"
          description="This will permanently remove the block and any uploaded audio files associated with it."
          confirmLabel="Delete Block"
          onConfirm={() => onDelete(qId, prompt.id)}
        />
      </div>

      {/* Editable title */}
      {editingPrompt?.id === prompt.id ? (
        <>
          <div className="flex gap-2 pr-24">
            <Textarea
              value={editingPrompt?.text || ''}
              onChange={(e) => onEditChange(e.target.value)}
              className="flex-1 min-h-[60px]"
            />
            <Button size="sm" className="mt-1" onClick={() => onEditSave(qId, prompt.id)}>
              <Check className="w-4 h-4" />
            </Button>
          </div>
          {/* Required toggle for short_answer during edit */}
          {prompt.type === 'short_answer' && (
            <div className="flex items-center space-x-2 pl-1">
              <input
                type="checkbox"
                id={`edit-required-${prompt.id}`}
                checked={editingPrompt?.options?.[0] !== 'optional'}
                onChange={(e) => {
                  const newOptions = [e.target.checked ? 'required' : 'optional']
                  onEditStart({ id: prompt.id, text: editingPrompt?.text || prompt.text, options: newOptions })
                }}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor={`edit-required-${prompt.id}`} className="text-sm text-gray-700 font-normal cursor-pointer">
                Required response
              </Label>
            </div>
          )}
        </>
      ) : (
        <h4 className="font-medium text-gray-900 pr-24 flex items-center gap-2">
          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded uppercase tracking-wider flex-shrink-0">
            {prompt.type || 'audio'}
          </span>
          <span className="whitespace-pre-wrap">{prompt.text}</span>
        </h4>
      )}

      {/* Options display for single_choice */}
      {prompt.type === 'single_choice' && prompt.options && (
        <div className="text-sm text-gray-500 ml-2 space-y-1">
          {prompt.options.map((o: string, i: number) => (
            <div key={i} className="flex items-center gap-1">
              <span className="w-4 h-4 rounded-full border border-gray-400 flex-shrink-0" />
              <span>{o}</span>
            </div>
          ))}
        </div>
      )}

      {/* Audio uploader for audio blocks */}
      {(!prompt.type || prompt.type === 'audio') && (
        <AudioUploader projectId={projectId} promptId={prompt.id} initialVariants={prompt.audio_variants || []} />
      )}
    </div>
  )
}

// ── Main Builder ───────────────────────────────────────────────────────────────
export function QuestionnaireBuilder({
  project,
  initialQuestionnaires,
}: {
  project: any
  initialQuestionnaires: any[]
}) {
  const [questionnaires, setQuestionnaires] = useState(initialQuestionnaires)
  const [newQTitle, setNewQTitle] = useState('')
  const [newBlockTexts, setNewBlockTexts] = useState<Record<string, string>>({})
  const [newBlockTypes, setNewBlockTypes] = useState<Record<string, string>>({})
  const [newBlockOptions, setNewBlockOptions] = useState<Record<string, string>>({})
  const [editingPrompt, setEditingPrompt] = useState<{ id: string; text: string; options?: string[] | null } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [collapsedQuestionnaires, setCollapsedQuestionnaires] = useState<Set<string>>(new Set())

  const toggleCollapse = (qId: string) => {
    setCollapsedQuestionnaires(prev => {
      const next = new Set(prev)
      if (next.has(qId)) next.delete(qId)
      else next.add(qId)
      return next
    })
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ── Questionnaire CRUD ──────────────────────────────────────────────────────
  async function handleCreateQuestionnaire(e: React.FormEvent) {
    e.preventDefault()
    if (!newQTitle) return
    const newQ = await createQuestionnaire(project.id, newQTitle)
    setQuestionnaires([...questionnaires, { ...newQ, prompts: [] }])
    setNewQTitle('')
  }

  async function handleDeleteQuestionnaire(qId: string) {
    try {
      await deleteQuestionnaire(qId, project.id)
      setQuestionnaires(questionnaires.filter((q) => q.id !== qId))
    } catch (e: any) {
      setErrorMsg('Error deleting questionnaire: ' + e.message)
    }
  }

  // ── Block CRUD ──────────────────────────────────────────────────────────────
  async function handleCreateBlock(qId: string, e: React.FormEvent) {
    e.preventDefault()
    const text = newBlockTexts[qId]
    if (!text) return
    try {
      const type = newBlockTypes[qId] || 'audio'
      let options = null
      if (type === 'single_choice') {
        options = (newBlockOptions[qId] || '')
          .split('\n')
          .map((o) => o.trim())
          .filter(Boolean)
        if (options.length === 0) {
          setErrorMsg('Please provide options for single choice (one per line)')
          return
        }
      } else if (type === 'short_answer') {
        options = [newBlockOptions[qId] || 'required']
      }

      // Determine order_index = current prompts count
      const currentQ = questionnaires.find((q) => q.id === qId)
      const order_index = (currentQ?.prompts || []).length

      const newPrompt = await createPrompt(qId, text, type, options)

      setQuestionnaires(
        questionnaires.map((q) => {
          if (q.id === qId) {
            return {
              ...q,
              prompts: [
                ...(q.prompts || []),
                { ...newPrompt, order_index, audio_variants: [] },
              ],
            }
          }
          return q
        })
      )
      setNewBlockTexts({ ...newBlockTexts, [qId]: '' })
      setNewBlockOptions({ ...newBlockOptions, [qId]: '' })
    } catch (e: any) {
      setErrorMsg('Error creating block: ' + e.message)
    }
  }

  async function handleDeletePrompt(qId: string, promptId: string) {
    try {
      await deletePrompt(promptId, project.id)
      setQuestionnaires(
        questionnaires.map((q) => {
          if (q.id === qId) {
            return { ...q, prompts: (q.prompts || []).filter((p: any) => p.id !== promptId) }
          }
          return q
        })
      )
    } catch (e: any) {
      setErrorMsg('Error deleting block: ' + e.message)
    }
  }

  async function handleUpdatePrompt(qId: string, promptId: string) {
    if (!editingPrompt) return
    try {
      const updates: any = { text: editingPrompt.text }
      if (editingPrompt.options !== undefined) updates.options = editingPrompt.options
      await updatePrompt(promptId, updates, project.id)
      setQuestionnaires(
        questionnaires.map((q) => {
          if (q.id === qId) {
            return {
              ...q,
              prompts: (q.prompts || []).map((p: any) =>
                p.id === promptId
                  ? { ...p, text: editingPrompt.text, ...(editingPrompt.options !== undefined ? { options: editingPrompt.options } : {}) }
                  : p
              ),
            }
          }
          return q
        })
      )
    } catch (e: any) {
      setErrorMsg('Error updating block: ' + e.message)
    }
    setEditingPrompt(null)
  }

  // ── Drag End ────────────────────────────────────────────────────────────────
  async function handleDragEnd(event: DragEndEvent, qId: string) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    // Compute new order outside of the state updater to avoid
    // calling a Server Action (which triggers Router) inside setState.
    const targetQ = questionnaires.find((q) => q.id === qId)
    if (!targetQ) return

    const prompts: any[] = targetQ.prompts || []
    const oldIdx = prompts.findIndex((p: any) => p.id === active.id)
    const newIdx = prompts.findIndex((p: any) => p.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return

    const reordered = arrayMove(prompts, oldIdx, newIdx).map(
      (p: any, i: number) => ({ ...p, order_index: i })
    )

    // Update UI state (pure — no side effects inside the updater)
    setQuestionnaires(
      questionnaires.map((q) =>
        q.id === qId ? { ...q, prompts: reordered } : q
      )
    )

    // Persist asynchronously after state has been set
    updatePromptOrders(reordered.map((p: any) => ({ id: p.id, order_index: p.order_index })))
      .catch((e) => setErrorMsg('Error saving order: ' + e.message))
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 flex items-center justify-between text-sm">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-4 font-bold text-red-500 hover:text-red-700">✕</button>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Questionnaires</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {questionnaires.map((q) => {
            const promptIds = (q.prompts || []).map((p: any) => p.id)
            return (
              <Card key={q.id} className="bg-gray-50/50">
                <CardHeader className="py-4 border-b flex flex-row items-center justify-between gap-2">
                  {/* Clickable area: chevron + title + count */}
                  <button
                    type="button"
                    onClick={() => toggleCollapse(q.id)}
                    className="flex-1 flex items-center gap-2 text-left min-w-0"
                  >
                    {collapsedQuestionnaires.has(q.id)
                      ? <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    }
                    <CardTitle className="text-lg truncate">{q.title}</CardTitle>
                    {collapsedQuestionnaires.has(q.id) && (
                      <span className="text-xs text-gray-400 font-normal flex-shrink-0">
                        {(q.prompts || []).length} block{(q.prompts || []).length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    }
                    title="Delete this questionnaire?"
                    description="This will permanently delete all its blocks, audio files, and collected responses."
                    confirmLabel="Delete Questionnaire"
                    onConfirm={() => handleDeleteQuestionnaire(q.id)}
                  />
                </CardHeader>
                {!collapsedQuestionnaires.has(q.id) && (
                  <CardContent className="pt-4 space-y-4">
                    {/* Sortable block list */}
                    <DndContext
                      id={`dnd-${q.id}`}
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleDragEnd(event, q.id)}
                    >
                      <SortableContext items={promptIds} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
                          {(q.prompts || []).map((prompt: any) => (
                            <SortableBlock
                              key={prompt.id}
                              prompt={prompt}
                              qId={q.id}
                              projectId={project.id}
                              editingPrompt={editingPrompt}
                              onEditStart={setEditingPrompt}
                              onEditSave={handleUpdatePrompt}
                              onEditChange={(text) =>
                                setEditingPrompt((prev) => (prev ? { ...prev, text } : null))
                              }
                              onDelete={handleDeletePrompt}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>

                    {/* Add block form */}
                    <form
                      onSubmit={(e) => handleCreateBlock(q.id, e)}
                      className="space-y-3 p-4 bg-gray-100/50 rounded-lg border border-dashed"
                    >
                      <div className="flex flex-col sm:flex-row items-start gap-2">
                        <select
                          className="border rounded-md px-3 py-2 text-sm bg-white mt-1 flex-shrink-0"
                          value={newBlockTypes[q.id] || 'audio'}
                          onChange={(e) =>
                            setNewBlockTypes({ ...newBlockTypes, [q.id]: e.target.value })
                          }
                        >
                          <option value="audio">Audio Block</option>
                          <option value="text">Text Block</option>
                          <option value="single_choice">Single Choice Block</option>
                          <option value="short_answer">Short Answer Block</option>
                        </select>
                        <Textarea
                          value={newBlockTexts[q.id] || ''}
                          onChange={(e) =>
                            setNewBlockTexts({ ...newBlockTexts, [q.id]: e.target.value })
                          }
                          placeholder={
                            newBlockTypes[q.id] === 'text'
                              ? 'Enter the text content to display…'
                              : 'Enter the prompt / question…'
                          }
                          className="flex-1 bg-white min-h-[60px]"
                        />
                        <Button type="submit" variant="secondary" className="mt-1 flex-shrink-0">
                          Add Block
                        </Button>
                      </div>
                      {newBlockTypes[q.id] === 'single_choice' && (
                        <Textarea
                          value={newBlockOptions[q.id] || ''}
                          onChange={(e) =>
                            setNewBlockOptions({ ...newBlockOptions, [q.id]: e.target.value })
                          }
                          placeholder={'Enter options, one per line:\nYes\nNo\nMaybe'}
                          className="bg-white min-h-[80px]"
                        />
                      )}
                      {newBlockTypes[q.id] === 'short_answer' && (
                        <div className="flex items-center space-x-2 pt-1 pl-1">
                          <input 
                            type="checkbox" 
                            id={`required-${q.id}`} 
                            checked={newBlockOptions[q.id] !== 'optional'}
                            onChange={(e) => setNewBlockOptions({ ...newBlockOptions, [q.id]: e.target.checked ? 'required' : 'optional' })}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <Label htmlFor={`required-${q.id}`} className="text-sm text-gray-700 font-normal cursor-pointer">
                            Required response
                          </Label>
                        </div>
                      )}
                    </form>
                  </CardContent>
                )}
              </Card>
            )
          })}

          {/* Add questionnaire form */}
          <form
            onSubmit={handleCreateQuestionnaire}
            className="flex items-center gap-2 pt-4 border-t"
          >
            <Input
              value={newQTitle}
              onChange={(e) => setNewQTitle(e.target.value)}
              placeholder="New Questionnaire Title (e.g. 'Group A')"
              className="flex-1"
            />
            <Button type="submit">
              <PlusCircle className="w-4 h-4 mr-2" /> Add Questionnaire
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
