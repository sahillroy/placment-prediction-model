import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { FormInput } from '@/components/ui/FormInput'
import { Button } from '@/components/ui/Button'
import { CategoryRow } from '@/components/results/CategoryRow'
import { useAnalysisResult, useWhatIfAnalysis } from '@/hooks/useAnalysis'
import type { AnalysisResult, MatrixBreakdown } from '@/types'

type EditableFields = {
    lcSubmissions: number
    githubContributions: number
    projectsDomain: number
    certsGlobal: number
    hackathonFirst: number
}

function DeltaBadge({ delta }: { delta: number }) {
    if (delta === 0) return <span className="text-xs text-slate-400">—</span>
    const color = delta > 0 ? 'text-emerald-600' : 'text-red-500'
    return (
        <span className={`text-sm font-semibold ${color}`}>
            {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}
        </span>
    )
}

function ScoreBlock({ label, value, highlighted }: { label: string; value: number; highlighted?: boolean }) {
    return (
        <div className={`rounded-2xl border p-5 text-center ${highlighted ? 'border-indigo-300 ring-2 ring-indigo-200 bg-indigo-50' : 'border-slate-100 bg-white'}`}>
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className={`text-4xl font-bold ${highlighted ? 'text-indigo-600' : 'text-slate-900'}`}>
                {value.toFixed(1)}%
            </p>
        </div>
    )
}

const MATRIX_KEYS: { key: keyof MatrixBreakdown; label: string }[] = [
    { key: 'coding', label: 'Coding Platforms' },
    { key: 'projects', label: 'Projects' },
    { key: 'certifications', label: 'Certifications' },
    { key: 'hackathons', label: 'Hackathons' },
]

export default function WhatIf() {
    const { id } = useParams<{ id: string }>()
    const { data: original } = useAnalysisResult(id ?? '')
    const whatIfMutation = useWhatIfAnalysis()
    const [newResult, setNewResult] = useState<AnalysisResult | null>(null)
    const [noChanges, setNoChanges] = useState(false)

    const [fields, setFields] = useState<EditableFields>({
        lcSubmissions: 0,
        githubContributions: 0,
        projectsDomain: 0,
        certsGlobal: 0,
        hackathonFirst: 0,
    })

    function handleRecalculate() {
        const hasChange = Object.values(fields).some((v) => v !== 0)
        if (!hasChange) { setNoChanges(true); return }
        setNoChanges(false)
        whatIfMutation.mutate(
            { submissionId: id ?? '', changes: fields },
            { onSuccess: (data) => setNewResult(data) },
        )
    }

    if (!original) {
        return (
            <PageLayout>
                <div className="flex flex-col items-center py-32 gap-4 text-center">
                    <p className="text-slate-500">Loading original result…</p>
                </div>
            </PageLayout>
        )
    }

    const probDelta = newResult ? newResult.probability - original.probability : null
    const matrixDelta = newResult ? newResult.matrixScore - original.matrixScore : null

    return (
        <PageLayout>
            <div className="mb-6">
                <Link to={`/results/${id}`} className="text-sm text-indigo-600 hover:underline">
                    ← Back to Results
                </Link>
                <h1 className="text-2xl font-bold text-slate-900 mt-2">What-If Simulator</h1>
                <p className="text-sm text-slate-500 mt-1">Edit fields to see how changes affect your probability.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ── Left: Edit Panel ── */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-5">
                    <h2 className="font-semibold text-slate-800">Adjust Your Inputs</h2>
                    <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500">
                        ℹ️ Enter the <strong>change</strong> you plan to make (e.g. +30 LC submissions), then click Recalculate.
                    </div>

                    <FormInput
                        label="Additional LeetCode Submissions"
                        type="number" min={0}
                        hint={`Current: ${original.shapContributions.find(c => c.feature === 'lc_submissions')?.value ?? '—'}`}
                        value={fields.lcSubmissions || ''}
                        onChange={(e) => setFields((f) => ({ ...f, lcSubmissions: +e.target.value }))}
                    />
                    <FormInput
                        label="Additional GitHub Contributions"
                        type="number" min={0}
                        value={fields.githubContributions || ''}
                        onChange={(e) => setFields((f) => ({ ...f, githubContributions: +e.target.value }))}
                    />
                    <FormInput
                        label="Additional Domain Projects"
                        type="number" min={0}
                        value={fields.projectsDomain || ''}
                        onChange={(e) => setFields((f) => ({ ...f, projectsDomain: +e.target.value }))}
                    />
                    <FormInput
                        label="Additional Global Certifications"
                        type="number" min={0}
                        value={fields.certsGlobal || ''}
                        onChange={(e) => setFields((f) => ({ ...f, certsGlobal: +e.target.value }))}
                    />
                    <FormInput
                        label="Additional Hackathon 1st Prize Wins"
                        type="number" min={0}
                        value={fields.hackathonFirst || ''}
                        onChange={(e) => setFields((f) => ({ ...f, hackathonFirst: +e.target.value }))}
                    />

                    {noChanges && (
                        <p className="text-xs text-amber-600">No changes detected. Edit at least one field.</p>
                    )}
                    {whatIfMutation.isError && (
                        <p className="text-xs text-red-500">Recalculation failed. Please try again.</p>
                    )}

                    <Button
                        onClick={handleRecalculate}
                        isLoading={whatIfMutation.isPending}
                        className="w-full"
                    >
                        Recalculate →
                    </Button>
                </div>

                {/* ── Right: Delta Panel ── */}
                <div className="flex flex-col gap-5">
                    {/* Probability comparison */}
                    <div>
                        <p className="text-sm font-medium text-slate-600 mb-3">Placement Probability</p>
                        <div className="grid grid-cols-3 items-center gap-3">
                            <ScoreBlock label="Original" value={original.probability} />
                            <div className="text-center">
                                {probDelta !== null ? <DeltaBadge delta={probDelta} /> : <span className="text-slate-300 text-lg">→</span>}
                            </div>
                            <ScoreBlock label="New" value={newResult?.probability ?? original.probability} highlighted={!!newResult} />
                        </div>
                    </div>

                    {/* Matrix score comparison */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-sm font-medium text-slate-600">Matrix Score</p>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-sm">{original.matrixScore}/100</span>
                                {matrixDelta !== null && (
                                    <>
                                        <span className="text-slate-300">→</span>
                                        <span className="font-semibold text-slate-800">{newResult!.matrixScore}/100</span>
                                        <DeltaBadge delta={matrixDelta} />
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            {MATRIX_KEYS.map(({ key, label }) => {
                                const curr = newResult ? newResult.matrixBreakdown[key] : original.matrixBreakdown[key]
                                const orig = original.matrixBreakdown[key]
                                const changed = newResult && curr.score !== orig.score
                                return (
                                    <div key={key} className={`${changed ? 'bg-emerald-50 rounded-lg p-2 -mx-2' : ''}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs text-slate-600 w-36">{label}</span>
                                            {changed && (
                                                <span className="text-xs text-emerald-600 font-medium">
                                                    {orig.score} → {curr.score} ✅
                                                </span>
                                            )}
                                        </div>
                                        <CategoryRow label="" earned={curr.score} max={curr.maxScore} />
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {!newResult && (
                        <div className="flex items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                            <p className="text-sm text-slate-400">Edit a field and click Recalculate to see your updated score</p>
                        </div>
                    )}
                </div>
            </div>
        </PageLayout>
    )
}
