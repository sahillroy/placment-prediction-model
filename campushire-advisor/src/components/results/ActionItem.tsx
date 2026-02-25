import type { Action } from '@/types'

const CATEGORY_ICONS: Record<string, string> = {
    projects: '🏗',
    ats: '📄',
    coding: '💻',
    github: '🐙',
    internship: '🏢',
    certifications: '🏆',
    hackathons: '⚡',
    cgpa: '📊',
}

interface ActionItemProps {
    action: Action
}

export function ActionItem({ action }: ActionItemProps) {
    const icon = CATEGORY_ICONS[action.category] ?? '✅'
    return (
        <div className="flex gap-4 border-l-4 border-indigo-500 pl-4 py-3 rounded-r-xl bg-indigo-50/40">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center">
                {action.priority}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{action.action}</p>
                <p className="text-xs text-slate-500 mt-0.5">{action.rationale}</p>
                <span className="inline-flex items-center gap-1 mt-2 bg-slate-100 rounded px-2 py-0.5 text-xs text-slate-600">
                    {icon} {action.category}
                </span>
            </div>
        </div>
    )
}
