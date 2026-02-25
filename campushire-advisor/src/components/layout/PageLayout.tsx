import type { ReactNode } from 'react'
import { Navbar } from './Navbar'

interface PageLayoutProps {
    children: ReactNode
    maxWidth?: 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl'
}

const widthMap = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
}

export function PageLayout({ children, maxWidth = '6xl' }: PageLayoutProps) {
    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className={`${widthMap[maxWidth]} mx-auto px-4 py-8`}>
                {children}
            </main>
        </div>
    )
}
