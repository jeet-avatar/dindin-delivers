import { useEffect, useState, useRef } from 'react'
import { contractsApi } from '../api/contracts'
import type { ContractStatus } from '../types/hospital'

type Step = 'INGEST' | 'EXTRACT' | 'VERIFY' | 'COMPARE'
const STEPS: Step[] = ['INGEST', 'EXTRACT', 'VERIFY', 'COMPARE']

function stepIndex(status: ContractStatus): number {
  if (status === 'pending_review' || status === 'active') return 4
  return 1
}

interface Props {
  contractId: string
  onReady: (status: ContractStatus) => void
}

export function LangGraphProgress({ contractId, onReady }: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const [timedOut, setTimedOut] = useState<'soft' | 'hard' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const startRef = useRef(Date.now())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const softTimedOutRef = useRef(false)

  useEffect(() => {
    startRef.current = Date.now()
    softTimedOutRef.current = false

    intervalRef.current = setInterval(async () => {
      const elapsed = Date.now() - startRef.current

      if (elapsed > 5 * 60 * 1000) {
        clearInterval(intervalRef.current!)
        setTimedOut('hard')
        return
      }
      if (elapsed > 2 * 60 * 1000 && !softTimedOutRef.current) {
        softTimedOutRef.current = true
        setTimedOut('soft')
      }

      try {
        const contract = await contractsApi.get(contractId)
        setCurrentStep(stepIndex(contract.status))
        if (contract.status === 'pending_review' || contract.status === 'active') {
          clearInterval(intervalRef.current!)
          onReady(contract.status)
        }
      } catch (_err) {
        clearInterval(intervalRef.current!)
        setError('Processing failed — please try again or contact support.')
      }
    }, 3000)

    return () => clearInterval(intervalRef.current!)
  }, [contractId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (timedOut === 'hard' || error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        {error ?? 'Processing timed out.'}{' '}
        <a href="mailto:support@hospital-demo.com" className="underline font-medium">
          Contact support
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {timedOut === 'soft' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
          Processing is taking longer than expected…
        </div>
      )}
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const done = i < currentStep
          const active = i === currentStep
          return (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    ${done ? 'bg-green-500 text-white' : active ? 'bg-navy text-white animate-pulse' : 'bg-slate-200 text-slate-500'}`}
                >
                  {done ? '✓' : i + 1}
                </div>
                <span className="text-xs mt-1 text-slate-500">{step}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-10 h-0.5 mb-4 ${done ? 'bg-green-400' : 'bg-slate-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
