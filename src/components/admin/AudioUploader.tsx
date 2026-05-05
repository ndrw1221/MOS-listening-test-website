'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createAudioVariant, deleteAudioVariant } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UploadCloud, FileAudio, Loader2, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function AudioUploader({ projectId, promptId, initialVariants }: { projectId: string, promptId: string, initialVariants: any[] }) {
  const [variants, setVariants] = useState(initialVariants)
  const [uploading, setUploading] = useState(false)
  const [modelName, setModelName] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    if (!modelName) {
      setUploadError('Please enter a model name first.')
      return
    }

    const file = e.target.files[0]
    setUploading(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${promptId}-${Date.now()}.${fileExt}`
      const filePath = `variants/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(filePath)

      const newVariant = await createAudioVariant(promptId, modelName, publicUrl)
      setVariants([...variants, newVariant])
      setModelName('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      setUploadError('Error uploading file: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(variantId: string) {
    try {
      await deleteAudioVariant(variantId, projectId)
      setVariants(variants.filter((v: any) => v.id !== variantId))
    } catch (e: any) {
      setUploadError('Error deleting audio: ' + e.message)
    }
  }

  return (
    <div className="space-y-4 border-l-2 border-gray-200 pl-4 ml-2">
      {uploadError && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 flex justify-between">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="ml-2 font-bold">✕</button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {variants.map((variant) => (
          <div key={variant.id} className="flex items-center justify-between bg-gray-50 p-2 rounded border text-sm group">
            <div className="flex items-center truncate max-w-[50%]">
              <FileAudio className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
              <span className="font-medium truncate">{variant.model_name}</span>
            </div>
            <div className="flex items-center">
              <audio src={variant.file_url} controls className="h-8 w-32 ml-2" />
              <ConfirmDialog
                trigger={
                  <button className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                }
                title="Delete this audio file?"
                description={`This will permanently remove "${variant.model_name}" from this block.`}
                confirmLabel="Delete"
                onConfirm={() => handleDelete(variant.id)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input 
          value={modelName} 
          onChange={e => setModelName(e.target.value)}
          placeholder="Model Name (e.g. Model A)" 
          className="w-48"
          disabled={uploading}
        />
        <input 
          type="file" 
          accept="audio/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={uploading || !modelName}
        />
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !modelName}
        >
          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
          Upload Audio
        </Button>
      </div>
    </div>
  )
}
