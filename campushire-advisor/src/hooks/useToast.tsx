import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface Toast {
    id: string
    message: string
    type: 'success' | 'error' | 'info'
}

interface ToastContextValue {
    toasts: Toast[]
    showToast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
        const id = Math.random().toString(36).slice(2)
        setToasts((prev) => [...prev, { id, message, type }])
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
    }, [])

    return (
        <ToastContext.Provider value={{ toasts, showToast }}>
            {children}
            <ToastContainer toasts={toasts} />
        </ToastContext.Provider>
    )
}

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be inside ToastProvider')
    return ctx.showToast
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
    const colorMap = {
        success: 'bg-emerald-500',
        error: 'bg-red-500',
        info: 'bg-indigo-500',
    }
    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`${colorMap[t.type]} text-white px-4 py-3 rounded-xl shadow-lg text-sm max-w-xs animate-in fade-in slide-in-from-bottom-2`}
                >
                    {t.message}
                </div>
            ))}
        </div>
    )
}
