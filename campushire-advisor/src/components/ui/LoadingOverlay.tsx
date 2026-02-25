interface LoadingOverlayProps {
    steps?: string[]
}

const DEFAULT_STEPS = ['Parsing resume…', 'Extracting features…', 'Computing Matrix Score…', 'Running model…', 'Generating recommendations…']

export function LoadingOverlay({ steps = DEFAULT_STEPS }: LoadingOverlayProps) {
    return (
        <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-4">
                <svg
                    className="h-10 w-10 text-indigo-600 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="text-slate-600 font-medium">Analysing your profile…</p>
            </div>
            <div className="flex flex-col gap-1.5 text-center">
                {steps.map((step) => (
                    <p key={step} className="text-xs text-slate-400">{step}</p>
                ))}
            </div>
        </div>
    )
}
