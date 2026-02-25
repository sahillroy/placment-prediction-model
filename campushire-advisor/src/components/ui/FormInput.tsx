import { type InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string
    error?: string
    hint?: string
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
    ({ label, error, hint, id, className, ...props }, ref) => {
        const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
        return (
            <div className="flex flex-col gap-1">
                <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
                    {label}
                </label>
                <input
                    id={inputId}
                    ref={ref}
                    className={clsx(
                        'rounded-xl border px-3 py-2.5 text-sm transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                        error
                            ? 'border-red-400 bg-red-50'
                            : 'border-slate-200 bg-white hover:border-slate-300',
                        className,
                    )}
                    {...props}
                />
                {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
                {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
        )
    },
)
FormInput.displayName = 'FormInput'
