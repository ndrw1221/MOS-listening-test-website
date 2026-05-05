'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Globe, Check } from 'lucide-react'

export function CopyLinkButton({ projectId }: { projectId: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const url = `${window.location.origin}/survey/${projectId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  return (
    <Button variant="outline" title="Copy Public Link" onClick={handleCopy}>
      {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Globe className="w-4 h-4 mr-2" />}
      {copied ? 'Copied!' : 'Copy Link'}
    </Button>
  )
}
