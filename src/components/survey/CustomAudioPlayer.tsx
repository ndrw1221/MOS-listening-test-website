'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause } from 'lucide-react'
import { Slider } from '@/components/ui/slider'

export function CustomAudioPlayer({ src, onPlayComplete }: { src: string, onPlayComplete: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setProgress((audio.currentTime / audio.duration) * 100)
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setProgress(100)
      onPlayComplete()
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [onPlayComplete])

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
        onPlayComplete() // Trigger immediately on play to relax constraints
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSliderChange = (val: number | readonly number[]) => {
    if (audioRef.current && duration) {
      const value = Array.isArray(val) ? val[0] : val as number;
      const newTime = (value / 100) * duration
      audioRef.current.currentTime = newTime
      setProgress(value)
    }
  }

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00'
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  const derivedCurrentTime = duration ? (progress / 100) * duration : 0;

  return (
    <div className="flex items-center gap-4 bg-gray-100 p-3 rounded-lg shadow-inner">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <button 
        onClick={togglePlay}
        className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-shrink-0"
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <Slider 
          value={[progress]} 
          max={100} 
          step={0.1} 
          onValueChange={handleSliderChange} 
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 font-medium px-1">
          <span>{formatTime(derivedCurrentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}
