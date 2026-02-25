interface ToggleProps {
    label: string
    checked: boolean
    onChange: (checked: boolean) => void
    hint?: string
}

export function Toggle({ label, checked, onChange, hint }: ToggleProps) {
    return (
        <div className="flex items-start gap-3">
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${checked ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
            >
                <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'
                        }`}
                />
            </button>
            <div>
                <p className="text-sm font-medium text-slate-700">{label}</p>
                {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
            </div>
        </div>
    )
}
