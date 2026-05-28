import React from 'react'
import { FileText, ScanSearch, GitBranch, Zap, CheckCircle2 } from 'lucide-react'

const STEPS = [
  { label: 'Input',    icon: FileText,   desc: 'Request received'        },
  { label: 'Analysis', icon: ScanSearch, desc: 'Finance agent scanning'  },
  { label: 'Decision', icon: GitBranch,  desc: 'Orchestrator routing'    },
  { label: 'Action',   icon: Zap,        desc: 'Executing actions'       },
]

interface DataFlowBarProps {
  isLoading: boolean
  loadingStep: string
  result: unknown
}

function computeStep(isLoading: boolean, loadingStep: string, result: unknown): number {
  if (result) return 4
  if (!isLoading) return 0
  if (loadingStep.includes('Action') || loadingStep.includes('Storing')) return 3
  if (loadingStep.includes('Finance') || loadingStep.includes('scanning')) return 2
  return 1
}

export default function DataFlowBar({ isLoading, loadingStep, result }: DataFlowBarProps) {
  const activeStep = computeStep(isLoading, loadingStep, result)

  return (
    <div className="card px-6 py-4">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const stepNum = i + 1
          const isActive   = activeStep === stepNum
          const isComplete = activeStep > stepNum
          const Icon = step.icon

          return (
            <React.Fragment key={step.label}>
              {/* Step node */}
              <div className="flex flex-col items-center gap-1 min-w-[56px]">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    transition-all duration-300
                    ${isComplete
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                      : isActive
                        ? 'bg-indigo-500/20 border border-indigo-500/60 text-indigo-400 ring-2 ring-indigo-500/20'
                        : 'bg-gray-800/60 border border-gray-700/40 text-gray-600'}
                  `}
                >
                  {isComplete ? <CheckCircle2 size={14} /> : <Icon size={13} />}
                </div>

                <span
                  className={`text-xs font-medium transition-colors duration-300 ${
                    isComplete ? 'text-emerald-400' : isActive ? 'text-indigo-400' : 'text-gray-600'
                  }`}
                >
                  {step.label}
                </span>

                {isActive && isLoading && (
                  <span className="text-[10px] text-gray-500 text-center leading-tight max-w-[68px]">
                    {step.desc}
                  </span>
                )}
              </div>

              {/* Connector */}
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px mx-3 relative overflow-hidden rounded-full">
                  <div className="absolute inset-0 bg-gray-800" />
                  {(isComplete || activeStep > stepNum) && (
                    <div className="absolute inset-0 bg-emerald-500/50 transition-all duration-700" />
                  )}
                  {activeStep === stepNum && isLoading && (
                    <div className="absolute inset-0 bg-indigo-500/40 animate-pulse" />
                  )}
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
