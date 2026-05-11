'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { submitAllResponses } from '@/actions/survey'
import { CustomAudioPlayer } from './CustomAudioPlayer'
import { RatingScale } from './RatingScale'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// Represents one response record to be flushed at the end
interface PendingResponse {
  promptId: string
  variantId: string | null
  scores: Record<string, any>
}

export function SurveyLayout({ 
  project, 
  questionnaireId, 
  prompts 
}: { 
  project: any, 
  questionnaireId: string, 
  prompts: any[] 
}) {
  const router = useRouter()
  const [sessionId, setSessionId] = useState('')
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0)
  
  // Track which variants have been played (at least once)
  const [playedVariants, setPlayedVariants] = useState<Record<string, boolean>>({})
  
  // Track scores: { variantId | promptId: { criteria: score } | { choice: value } }
  const [scores, setScores] = useState<Record<string, Record<string, any>>>({})

  // Buffer of all responses accumulated during the survey — only submitted at the very end
  const [pendingResponses, setPendingResponses] = useState<PendingResponse[]>([])
  
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentPromptIndex])

  useEffect(() => {
    setSessionId(Math.random().toString(36).substring(2, 15))
  }, [])

  if (!prompts || prompts.length === 0) {
    return <div className="text-center p-8">No prompts available for this survey.</div>
  }

  const currentPrompt = prompts[currentPromptIndex]
  const criteriaList = project.criteria_settings || []
  const blockType = currentPrompt.type || 'audio'
  const isLastPrompt = currentPromptIndex === prompts.length - 1

  // ── Audio-only progress ──────────────────────────────────────────────────────
  const isAudioBlock = (p: any) => !p.type || p.type === 'audio'
  const totalAudio = prompts.filter(isAudioBlock).length
  // How many audio prompts sit before the current index
  const audioCompleted = prompts.slice(0, currentPromptIndex).filter(isAudioBlock).length
  // If the current prompt is audio it counts as "in progress" (show its number)
  const audioCurrentLabel = isAudioBlock(currentPrompt) ? audioCompleted + 1 : audioCompleted
  const audioProgressPct = totalAudio > 0 ? (audioCompleted / totalAudio) * 100 : 0

  // ── Completion check for the current prompt ──────────────────────────────────
  let isCurrentPromptComplete = false
  if (blockType === 'text') {
    isCurrentPromptComplete = true
  } else if (blockType === 'single_choice') {
    isCurrentPromptComplete = !!scores[currentPrompt.id]?.choice
  } else if (blockType === 'short_answer') {
    const text = scores[currentPrompt.id]?.text || ''
    const isOptional = currentPrompt.options && currentPrompt.options[0] === 'optional'
    isCurrentPromptComplete = isOptional ? true : text.trim().length > 0
  } else {
    isCurrentPromptComplete = (currentPrompt.audio_variants?.length ?? 0) > 0 &&
      currentPrompt.audio_variants?.every((variant: any) => {
        const hasPlayed = playedVariants[variant.id]
        const hasAllScores = criteriaList.every((crit: string) => scores[variant.id]?.[crit])
        return hasPlayed && hasAllScores
      })
  }

  // ── Build the response record(s) for the current prompt ──────────────────────
  function buildResponsesForCurrentPrompt(): PendingResponse[] {
    if (blockType === 'text') {
      return [{ promptId: currentPrompt.id, variantId: null, scores: { type: 'text' } }]
    }
    if (blockType === 'single_choice') {
      return [{ promptId: currentPrompt.id, variantId: null, scores: { choice: scores[currentPrompt.id]?.choice } }]
    }
    if (blockType === 'short_answer') {
      return [{ promptId: currentPrompt.id, variantId: null, scores: { text: scores[currentPrompt.id]?.text } }]
    }
    // audio
    return (currentPrompt.audio_variants || []).map((variant: any) => ({
      promptId: currentPrompt.id,
      variantId: variant.id,
      scores: scores[variant.id],
    }))
  }

  // ── Handle Next / Submit ─────────────────────────────────────────────────────
  const handleNext = async () => {
    if (!isCurrentPromptComplete) return

    const newResponses = [...pendingResponses, ...buildResponsesForCurrentPrompt()]
    setPendingResponses(newResponses)

    if (!isLastPrompt) {
      // Just advance — nothing written to DB yet
      setCurrentPromptIndex(currentPromptIndex + 1)
      return
    }

    // ── Final submit: flush everything at once in a single bulk request ──
    setSubmitting(true)
    try {
      const formattedResponses = newResponses.map(r => ({
        promptId: r.promptId,
        variantId: r.variantId,
        scores: r.scores
      }))
      
      await submitAllResponses(sessionId, questionnaireId, formattedResponses)
      router.push('/survey/complete')
    } catch (err) {
      alert('Error submitting responses. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{project.title}</h1>
          {totalAudio > 0 && (
            <div className="flex items-center justify-center gap-2">
              <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${audioProgressPct}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-500 whitespace-nowrap">
                {isAudioBlock(currentPrompt) ? `${audioCurrentLabel} / ${totalAudio}` : `${audioCompleted} / ${totalAudio} audio done`}
              </span>
            </div>
          )}
        </div>

        {/* Prompt Context / Block Content */}
        <div className={blockType === 'audio' ? "sticky top-4 z-10" : ""}>
          <Card className="border-t-4 border-t-blue-600 shadow-md">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-2">
                {blockType === 'audio' ? 'Prompt Context' : blockType === 'single_choice' || blockType === 'short_answer' ? 'Question' : 'Information'}
                {blockType === 'short_answer' && currentPrompt.options?.[0] === 'optional' && (
                  <span className="text-gray-400 ml-2 normal-case font-normal">(Optional)</span>
                )}
              </h2>
              <p className="text-xl sm:text-2xl text-gray-900 font-medium leading-relaxed whitespace-pre-wrap">
                {currentPrompt.text}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Single Choice Block UI */}
        {blockType === 'single_choice' && currentPrompt.options && (
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <RadioGroup 
                value={scores[currentPrompt.id]?.choice || ""}
                onValueChange={(val) => setScores(prev => ({
                  ...prev,
                  [currentPrompt.id]: { choice: val }
                }))}
                className="flex flex-col space-y-3"
              >
                {currentPrompt.options.map((option: string) => (
                  <div key={option} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 border border-transparent transition-colors has-[:checked]:border-blue-200 has-[:checked]:bg-blue-50">
                    <RadioGroupItem value={option} id={`option-${option}`} />
                    <Label htmlFor={`option-${option}`} className="flex-1 cursor-pointer text-base">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Short Answer Block UI */}
        {blockType === 'short_answer' && (
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <Textarea
                placeholder="Type your answer here..."
                value={scores[currentPrompt.id]?.text || ""}
                onChange={(e) => setScores(prev => ({
                  ...prev,
                  [currentPrompt.id]: { text: e.target.value }
                }))}
                className="min-h-[120px] text-base"
              />
            </CardContent>
          </Card>
        )}

        {/* Audio Block UI */}
        {blockType === 'audio' && (
          <div className="space-y-8">
            {currentPrompt.audio_variants?.map((variant: any, idx: number) => {
              const letter = String.fromCharCode(65 + idx) // A, B, C...
              
              return (
                <Card key={variant.id} className="overflow-hidden shadow-sm hover:shadow transition-shadow">
                  <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800">Sample {letter}</h3>
                    {playedVariants[variant.id] && (
                      <span className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Listened
                      </span>
                    )}
                  </div>
                  
                  <CardContent className="p-6 space-y-6">
                    <CustomAudioPlayer 
                      src={variant.file_url} 
                      onPlayComplete={() => setPlayedVariants(prev => ({ ...prev, [variant.id]: true }))} 
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {criteriaList.map((criteria: string) => (
                        <RatingScale 
                          key={criteria}
                          criteria={criteria}
                          value={scores[variant.id]?.[criteria]}
                          onChange={(val) => setScores(prev => ({
                            ...prev,
                            [variant.id]: {
                              ...(prev[variant.id] || {}),
                              [criteria]: val
                            }
                          }))}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end pt-4 pb-12">
          <Button 
            size="lg" 
            onClick={handleNext} 
            disabled={!isCurrentPromptComplete || submitting}
            className="w-full sm:w-auto px-8 py-6 text-lg"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isLastPrompt ? (
              'Submit Survey'
            ) : (
              'Next'
            )}
          </Button>
        </div>

      </div>
    </div>
  )
}
