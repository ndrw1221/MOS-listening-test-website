import { CheckCircle2 } from 'lucide-react'

export default function SurveyCompletePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center p-8 sm:p-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-4">
          Thank You!
        </h1>
        
        <p className="text-lg text-gray-600 leading-relaxed">
          Your responses have been recorded successfully. We appreciate your time and contribution to this research.
        </p>

        <div className="mt-8 pt-8 border-t border-gray-100">
          <p className="text-sm text-gray-400">
            You may now close this window.
          </p>
        </div>
      </div>
    </div>
  )
}
