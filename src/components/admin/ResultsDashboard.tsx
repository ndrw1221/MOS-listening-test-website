'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Download, Users, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { getProjectResponses, deleteSession } from '@/actions/admin'

interface Response {
  id: string
  session_id: string
  questionnaire_id: string
  created_at: string
  prompts?: { text: string } | null
  audio_variants?: { model_name: string } | null
  criteria_scores: Record<string, any>
}

interface SessionGroup {
  sessionId: string
  responses: Response[]
  startTime: string
}

export function ResultsDashboard({ projectId, criteriaList }: { projectId: string, criteriaList: string[] }) {
  const router = useRouter()
  const [responses, setResponses] = useState<Response[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  useEffect(() => {
    loadResponses()
  }, [projectId])

  async function loadResponses() {
    setLoading(true)
    try {
      const data = await getProjectResponses(projectId)
      setResponses((data as Response[]) || [])
    } catch (err) {
      console.error('Failed to load responses', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (responses.length === 0) return

    const headers = ['Timestamp', 'Session ID', 'Questionnaire ID', 'Prompt', 'Model Variant', ...criteriaList]
    const csvRows = [headers.join(',')]

    responses.forEach(r => {
      const row = [
        new Date(r.created_at).toISOString(),
        r.session_id,
        r.questionnaire_id,
        `"${(r.prompts?.text || '').replace(/"/g, '""')}"`,
        `"${(r.audio_variants?.model_name || '').replace(/"/g, '""')}"`
      ]
      criteriaList.forEach(crit => { row.push(r.criteria_scores?.[crit] || '') })
      csvRows.push(row.join(','))
    })

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `results_${projectId}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSession(sessionId, projectId)
    // Remove from local state immediately
    setResponses(prev => prev.filter(r => r.session_id !== sessionId))
    // Bust the router cache so re-navigating shows fresh data
    router.refresh()
  }

  // Group responses by session
  const sessionGroups: SessionGroup[] = Object.values(
    responses.reduce((acc: Record<string, SessionGroup>, r) => {
      if (!acc[r.session_id]) {
        acc[r.session_id] = { sessionId: r.session_id, responses: [], startTime: r.created_at }
      }
      if (new Date(r.created_at) < new Date(acc[r.session_id].startTime)) {
        acc[r.session_id].startTime = r.created_at
      }
      acc[r.session_id].responses.push(r)
      return acc
    }, {})
  ).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Results Dashboard</CardTitle>
            <CardDescription>View and manage participant submissions.</CardDescription>
          </div>
          <Button onClick={handleExportCSV} disabled={responses.length === 0} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export to CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading results...</p>
        ) : sessionGroups.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No submissions yet.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="p-2 bg-blue-100 rounded-full">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Total Participants</p>
                <p className="text-2xl font-bold text-gray-900">{sessionGroups.length}</p>
              </div>
            </div>

            <div className="space-y-2">
              {sessionGroups.map((group) => (
                <div key={group.sessionId} className="border rounded-lg overflow-hidden">
                  {/* Session header row */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <button
                      className="flex-1 flex items-center gap-3 text-left"
                      onClick={() =>
                        setExpandedSession(expandedSession === group.sessionId ? null : group.sessionId)
                      }
                    >
                      <span className="font-mono text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                        {group.sessionId.substring(0, 8)}…
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(group.startTime).toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-400">
                        {group.responses.length} response{group.responses.length !== 1 ? 's' : ''}
                      </span>
                      {expandedSession === group.sessionId
                        ? <ChevronUp className="w-4 h-4 text-gray-400 ml-auto" />
                        : <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
                      }
                    </button>

                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      }
                      title="Delete this submission?"
                      description={`This will permanently delete all responses from session ${group.sessionId.substring(0, 8)}…. This cannot be undone.`}
                      confirmLabel="Delete Submission"
                      onConfirm={() => handleDeleteSession(group.sessionId)}
                    />
                  </div>

                  {/* Expanded detail view */}
                  {expandedSession === group.sessionId && (
                    <div className="border-t divide-y">
                      {group.responses.map((r) => (
                        <div key={r.id} className="px-4 py-2 text-xs text-gray-600 bg-white">
                          <div className="flex gap-2 flex-wrap">
                            <span className="font-medium text-gray-800 truncate max-w-[200px]">
                              {r.prompts?.text || '(text/choice block)'}
                            </span>
                            {r.audio_variants?.model_name && (
                              <span className="text-gray-400">— {r.audio_variants.model_name}</span>
                            )}
                            {r.criteria_scores && Object.entries(r.criteria_scores).map(([k, v]) => (
                              <span key={k} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                                {k}: <strong>{v}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
