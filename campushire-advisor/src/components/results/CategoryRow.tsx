interface CategoryRowProps {
    label: string
    earned: number
    max: number
}

function getBarColor(pct: number) {
    if (pct >= 0.7) return 'bg-emerald-500'
    if (pct >= 0.4) return 'bg-amber-400'
    return 'bg-red-400'
}

export function CategoryRow({ label, earned, max }: CategoryRowProps) {
    const pct = max > 0 ? earned / max : 0
    const barColor = getBarColor(pct)

    return (
        <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 w-44 shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-2 rounded-full transition-all ${barColor}`}
                    style={{ width: `${pct * 100}%` }}
                />
            </div>
            <span className="text-sm font-medium text-slate-700 w-14 text-right shrink-0">
                {earned}/{max}
            </span>
        </div>
    )
}
