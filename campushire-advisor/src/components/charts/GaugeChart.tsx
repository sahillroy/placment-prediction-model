import { PieChart, Pie, Cell } from 'recharts'

interface GaugeChartProps {
    value: number // 0-100
}

function getColor(value: number) {
    if (value >= 65) return '#10b981' // emerald
    if (value >= 40) return '#f59e0b' // amber
    return '#ef4444' // red
}

function getLabel(value: number) {
    if (value >= 75) return 'Strong'
    if (value >= 55) return 'Above Average'
    if (value >= 40) return 'Average'
    return 'At Risk'
}

export function GaugeChart({ value }: GaugeChartProps) {
    const clamped = Math.max(0, Math.min(100, value))
    const color = getColor(clamped)
    const label = getLabel(clamped)

    // Arc: 180° gauge using two segments
    const filled = (clamped / 100) * 180
    const data = [
        { value: filled },
        { value: 180 - filled },
    ]

    return (
        <div className="flex flex-col items-center">
            <div className="relative">
                <PieChart width={200} height={110}>
                    <Pie
                        data={data}
                        cx={100}
                        cy={100}
                        startAngle={180}
                        endAngle={0}
                        innerRadius={60}
                        outerRadius={90}
                        dataKey="value"
                        strokeWidth={0}
                    >
                        <Cell fill={color} />
                        <Cell fill="#e2e8f0" />
                    </Pie>
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                    <span className="text-4xl font-bold text-slate-900">{clamped}%</span>
                    <span className="text-xs font-medium mt-0.5" style={{ color }}>
                        {label}
                    </span>
                </div>
            </div>
        </div>
    )
}
