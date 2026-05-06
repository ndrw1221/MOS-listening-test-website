'use client'

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export function RatingScale({ 
  criteria, 
  value, 
  onChange 
}: { 
  criteria: string, 
  value: number | undefined, 
  onChange: (val: number) => void 
}) {
  const getDescription = (crit: string) => {
    switch (crit.toLowerCase()) {
      case 'audio fidelity':
        return 'Evaluates the audio quality, signal clarity, and the absence of perceptible digital artifacts or distortion.'
      case 'prompt adherence':
        return 'Assesses how accurately the generated musical elements, such as instrumentation, genre, and mood/theme correspond to the attributes requested in the text prompt.'
      case 'musicality':
        return 'Measures intrinsic musical quality, including rhythmic stability, harmonic coherence, structural development, and general listenability.'
      case 'overall':
        return 'Captures the holistic impression of the generated music by integrating production quality, prompt relevance, and musical appeal into a single overall judgment.'
      default:
        return null
    }
  }

  const description = getDescription(criteria)

  return (
    <div className="flex flex-col space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
      <div className="flex flex-col space-y-1">
        <div className="flex justify-between items-center">
          <Label className="text-base font-medium text-gray-800">{criteria}</Label>
          <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
            {value ? value : '-'} / 5
          </span>
        </div>
        {description && (
          <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
        )}
      </div>
      
      <RadioGroup 
        value={value !== undefined ? value.toString() : ""} 
        onValueChange={(val) => onChange(parseInt(val))}
        className="flex justify-between mt-2"
      >
        {[1, 2, 3, 4, 5].map((num) => (
          <div key={num} className="flex flex-col items-center space-y-2">
            <RadioGroupItem 
              value={num.toString()} 
              id={`${criteria}-${num}`} 
              className="w-8 h-8 md:w-10 md:h-10 border-2"
            />
            <Label 
              htmlFor={`${criteria}-${num}`} 
              className="text-xs text-gray-500 cursor-pointer"
            >
              {num}
            </Label>
          </div>
        ))}
      </RadioGroup>
      
      <div className="flex justify-between text-xs text-gray-400 px-1 pt-1">
        <span>Poor</span>
        <span>Excellent</span>
      </div>
    </div>
  )
}
