import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts'
import type { ShapContribution } from '@/types'

interface SHAPBarChartProps {
    contributions: ShapContribution[]
}

const FEATURE_LABELS: Record<string, string> = {
    lc_submissions: 'LeetCode Submissions',
    cgpa_normalised: 'CGPA',
    ats_score: 'Resume ATS Score',
    matrix_score: 'Matrix Score',
    github_contributions: 'GitHub Contributions',
    internship_count: 'Internships',
    hr_badges: 'HackerRank Badges',
    projects_domain: 'Domain Projects',
    certs_global: 'Global Certifications',
    hackathon_first: 'Hackathon Wins',
}

export function SHAPBarChart({ contributions }: SHAPBarChartProps) {
    const data = contributions.map((c) => ({
        name: FEATURE_LABELS[c.feature] ?? c.feature.replace(/_/g, ' '),
        contribution: parseFloat(c.contribution.toFixed(1)),
    }))

    return (
        <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                    dataKey="name"
                    type="category"
                    width={160}
                    tick={{ fontSize: 12, fill: '#475569' }}
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip
                    formatter={(val: number) => [`${val > 0 ? '+' : ''}${val}%`, 'Impact']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
                    {data.map((entry, i) => (
                        <Cell
                            key={i}
                            fill={entry.contribution >= 0 ? '#6366f1' : '#ef4444'}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    )
}
