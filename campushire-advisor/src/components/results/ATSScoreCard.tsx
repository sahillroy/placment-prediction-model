interface ATSScoreCardProps {
    atsScore: number
    keywordGaps: string[]
}

function getScoreColor(score: number) {
    if (score >= 75) return 'text-emerald-600'
    if (score >= 50) return 'text-amber-600'
    return 'text-red-500'
}

export function ATSScoreCard({ atsScore, keywordGaps }: ATSScoreCardProps) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex justify-between items-baseline mb-4">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                    Resume ATS Score
                </h2>
                <span className={`text-2xl font-bold ${getScoreColor(atsScore)}`}>
                    {atsScore}
                    <span className="text-sm font-normal text-slate-400">/100</span>
                </span>
            </div>

            {keywordGaps.length > 0 && (
                <div>
                    <p className="text-xs text-slate-500 mb-2">Missing keywords</p>
                    <div className="flex flex-wrap gap-2">
                        {keywordGaps.map((kw) => (
                            <span
                                key={kw}
                                className="bg-red-50 text-red-600 border border-red-200 rounded-full px-3 py-1 text-xs font-medium"
                            >
                                {kw}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {keywordGaps.length === 0 && (
                <p className="text-xs text-emerald-600">✓ No major keyword gaps detected</p>
            )}
        </div>
    )
}
