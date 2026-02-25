interface ProgressBarProps {
    currentStep: number
    totalSteps: number
    stepLabels: string[]
}

export function ProgressBar({ currentStep, totalSteps, stepLabels }: ProgressBarProps) {
    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-2">
                {stepLabels.map((label, i) => {
                    const step = i + 1
                    const isCompleted = step < currentStep
                    const isCurrent = step === currentStep
                    return (
                        <div key={label} className="flex flex-col items-center gap-1 flex-1">
                            <div
                                className={`h-2 w-full rounded-full transition-all ${i === 0 ? 'rounded-l-full' : ''
                                    } ${i === totalSteps - 1 ? 'rounded-r-full' : ''} ${isCompleted ? 'bg-indigo-600' : isCurrent ? 'bg-indigo-400' : 'bg-slate-200'
                                    }`}
                            />
                            <span
                                className={`text-xs hidden sm:block ${isCurrent ? 'text-indigo-600 font-medium' : 'text-slate-400'
                                    }`}
                            >
                                {label}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
