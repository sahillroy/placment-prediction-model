import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import type { AnalysisResult, WizardFormData } from '@/types'

export function useSubmitAnalysis() {
    const navigate = useNavigate()

    return useMutation({
        mutationFn: async (data: WizardFormData) => {
            const formData = new FormData()
            const { resumeFile, ...rest } = data
            formData.append('profile', JSON.stringify(rest))
            if (resumeFile) formData.append('resume', resumeFile)

            const res = await api.post<AnalysisResult>('/analyse', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            return res.data
        },
        onSuccess: (result) => {
            navigate(`/results/${result.submissionId}`)
        },
    })
}

export function useAnalysisResult(id: string) {
    return useQuery({
        queryKey: ['analysis', id],
        queryFn: () =>
            api.get<AnalysisResult>(`/analyse/${id}`).then((r) => r.data),
        enabled: !!id,
    })
}

export function useWhatIfAnalysis() {
    return useMutation({
        mutationFn: async (payload: { submissionId: string; changes: Record<string, unknown> }) =>
            api
                .post<AnalysisResult>('/analyse/whatif', payload)
                .then((r) => r.data),
    })
}
