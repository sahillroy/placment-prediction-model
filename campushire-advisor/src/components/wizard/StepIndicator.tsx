interface StepIndicatorProps {
    currentStep: number
    totalSteps: number
    stepName: string
}

export function StepIndicator({ currentStep, totalSteps, stepName }: StepIndicatorProps) {
    return (
        <p className="text-sm text-slate-500 mb-1">
            Step {currentStep} of {totalSteps}{' '}
            <span className="text-slate-400">—</span>{' '}
            <span className="font-medium text-slate-700">{stepName}</span>
        </p>
    )
}
