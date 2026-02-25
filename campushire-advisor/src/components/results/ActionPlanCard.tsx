import type { Action } from '@/types'
import { ActionItem } from './ActionItem'
import { SHAPBarChart } from '@/components/charts/SHAPBarChart'
import type { ShapContribution } from '@/types'

interface ActionPlanCardProps {
    actions: Action[]
    shapContributions: ShapContribution[]
}

export function ActionPlanCard({ actions, shapContributions }: ActionPlanCardProps) {
    return (
        <div className="flex flex-col gap-4">
            {/* SHAP Insights */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                    Top Factors Influencing Your Score
                </h2>
                <SHAPBarChart contributions={shapContributions} />
            </div>

            {/* Action Plan */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                    Recommended Actions
                </h2>
                <div className="flex flex-col gap-3">
                    {actions.map((action) => (
                        <ActionItem key={action.priority} action={action} />
                    ))}
                </div>
            </div>
        </div>
    )
}
