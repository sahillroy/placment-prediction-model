import type { MatrixBreakdown } from '@/types'
import { CategoryRow } from './CategoryRow'

const CATEGORY_LABELS: { key: keyof MatrixBreakdown; label: string }[] = [
    { key: 'tenth_pct', label: '10th Board %' },
    { key: 'twelfth_pct', label: '12th Board %' },
    { key: 'cgpa', label: 'CGPA' },
    { key: 'github', label: 'GitHub Activity' },
    { key: 'coding_platform', label: 'Coding Platforms' },
    { key: 'internship', label: 'Internship' },
    { key: 'certifications', label: 'Certifications' },
    { key: 'projects', label: 'Projects' },
    { key: 'hackathons', label: 'Hackathons' },
]

interface MatrixScoreCardProps {
    matrixScore: number
    matrixBreakdown: MatrixBreakdown
}

export function MatrixScoreCard({ matrixScore, matrixBreakdown }: MatrixScoreCardProps) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex justify-between items-baseline mb-5">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                    RBU Placement Matrix
                </h2>
                <span className="text-2xl font-bold text-slate-900">
                    {matrixScore}
                    <span className="text-sm font-normal text-slate-400">/100</span>
                </span>
            </div>

            <div className="flex flex-col gap-3">
                {CATEGORY_LABELS.map(({ key, label }) => (
                    <CategoryRow
                        key={key}
                        label={label}
                        earned={matrixBreakdown[key].earned}
                        max={matrixBreakdown[key].max}
                    />
                ))}
            </div>
        </div>
    )
}
