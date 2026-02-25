import type { AnalysisResult } from '@/types'
import { GaugeChart } from '@/components/charts/GaugeChart'

type Props = Pick<AnalysisResult, 'probability' | 'confidenceBand'>

export function ProbabilityCard({ probability, confidenceBand }: Props) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col items-center gap-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide self-start">
                Placement Probability
            </h2>
            <GaugeChart value={probability} />
            <p className="text-xs text-slate-400">
                Confidence range:{' '}
                <span className="font-medium text-slate-600">
                    {confidenceBand[0]}% – {confidenceBand[1]}%
                </span>
            </p>
        </div>
    )
}
