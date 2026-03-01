import type { ReactNode } from 'react'

interface AuthLayoutProps {
    children: ReactNode
    title: string
    subtitle?: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <span className="text-4xl"></span>
                    <h1 className="mt-3 text-2xl font-bold text-slate-900">{title}</h1>
                    {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                    {children}
                </div>
            </div>
        </div>
    )
}
