import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageLayout } from '@/components/layout/PageLayout'
import { ProgressBar } from '@/components/wizard/ProgressBar'
import { StepIndicator } from '@/components/wizard/StepIndicator'
import { FileDropzone } from '@/components/wizard/FileDropzone'
import { FormInput } from '@/components/ui/FormInput'
import { Toggle } from '@/components/ui/Toggle'
import { Button } from '@/components/ui/Button'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'
import {
    academicSchema, codingSchema, experienceSchema,
    type AcademicFormValues, type CodingFormValues, type ExperienceFormValues,
} from '@/lib/validators'
import { useSubmitAnalysis } from '@/hooks/useAnalysis'
import type { WizardFormData, InternshipType } from '@/types'

const STEP_LABELS = ['Academic', 'Coding', 'Experience', 'Resume']
const BRANCHES = ['CSE', 'IT', 'ECE', 'ENTC', 'Mechanical', 'Civil', 'Chemical', 'Other']
const INTERNSHIP_TYPES: { value: InternshipType; label: string }[] = [
    { value: 'international', label: 'International / Credit Transfer' },
    { value: 'it_company', label: 'IT Company / Academic Institute' },
    { value: 'eduskills', label: 'EduSkills' },
    { value: 'none', label: 'None' },
]

function InfoNote({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex gap-2 bg-slate-50 rounded-xl p-3 text-slate-500 text-xs">
            <span>ℹ️</span><span>{children}</span>
        </div>
    )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
    return <h2 className="text-lg font-semibold text-slate-800 mb-4">{children}</h2>
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-5">
            <p className="text-sm font-medium text-slate-600 mb-3">{title}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
        </div>
    )
}

export default function ProfileWizard() {
    const [step, setStep] = useState(1)
    const [resumeFile, setResumeFile] = useState<File | null>(null)
    const [formData, setFormData] = useState<Partial<WizardFormData>>({})
    const submitAnalysis = useSubmitAnalysis()

    // Step 1
    const step1 = useForm<AcademicFormValues>({ resolver: zodResolver(academicSchema), defaultValues: { cgpaScale: 10, year: 3, backlogs: 0 } })
    // Step 2
    const step2 = useForm<CodingFormValues>({ resolver: zodResolver(codingSchema), defaultValues: { lcSubmissions: 0, hrBadges: 0, hrMedHardSolved: 0, githubContributions: 0, githubCollaborations: 0, githubMonthlyActive: false } })
    // Step 3
    const step3 = useForm<ExperienceFormValues>({ resolver: zodResolver(experienceSchema), defaultValues: { internshipType: 'none', internshipCount: 0, internshipStipendAbove10k: false, projectsIndustry: 0, projectsDomain: 0, certsGlobal: 0, certsNptel: 0, certsRbu: 0, hackathonFirst: 0, hackathonSecond: 0, hackathonThird: 0, hackathonParticipation: 0 } })

    function handleStep1(data: AcademicFormValues) {
        setFormData((prev) => ({ ...prev, academic: data }))
        setStep(2)
    }
    function handleStep2(data: CodingFormValues) {
        setFormData((prev) => ({ ...prev, coding: data }))
        setStep(3)
    }
    function handleStep3(data: ExperienceFormValues) {
        setFormData((prev) => ({ ...prev, experience: data }))
        setStep(4)
    }
    function handleFinalSubmit() {
        if (!resumeFile) return
        submitAnalysis.mutate({ ...formData, resumeFile } as WizardFormData)
    }

    const numInput = (label: string, name: string, form: ReturnType<typeof useForm<CodingFormValues | ExperienceFormValues>>, placeholder = 'e.g. 0') => (
        <FormInput
            label={label}
            type="number"
            min={0}
            placeholder={placeholder}
            error={(form.formState.errors as Record<string, { message?: string }>)[name]?.message}
            {...form.register(name as never, { valueAsNumber: true })}
        />
    )

    return (
        <PageLayout maxWidth="2xl">
            {submitAnalysis.isPending && <LoadingOverlay />}

            <div className="mb-8">
                <StepIndicator currentStep={step} totalSteps={4} stepName={STEP_LABELS[step - 1]} />
                <ProgressBar currentStep={step} totalSteps={4} stepLabels={STEP_LABELS} />
            </div>

            {/* ── Step 1: Academic ── */}
            {step === 1 && (
                <form onSubmit={step1.handleSubmit(handleStep1)} className="flex flex-col gap-6">
                    <SectionHeader>Academic Details</SectionHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormInput label="CGPA" type="number" step="0.01" placeholder="e.g. 7.8" error={step1.formState.errors.cgpa?.message} {...step1.register('cgpa', { valueAsNumber: true })} />
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-slate-700">CGPA Scale</label>
                            <select className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" {...step1.register('cgpaScale', { valueAsNumber: true })}>
                                <option value={10}>10.0 scale</option>
                                <option value={4}>4.0 scale</option>
                            </select>
                        </div>
                        <FormInput label="10th Board %" type="number" step="0.01" placeholder="e.g. 85.4" error={step1.formState.errors.tenthPct?.message} {...step1.register('tenthPct', { valueAsNumber: true })} />
                        <FormInput label="12th Board %" type="number" step="0.01" placeholder="e.g. 78.2" error={step1.formState.errors.twelfthPct?.message} {...step1.register('twelfthPct', { valueAsNumber: true })} />
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-slate-700">Branch</label>
                            <select className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" {...step1.register('branch')}>
                                <option value="">Select branch</option>
                                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                            </select>
                            {step1.formState.errors.branch && <p className="text-xs text-red-500">{step1.formState.errors.branch.message}</p>}
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-slate-700">Year</label>
                            <select className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" {...step1.register('year', { valueAsNumber: true })}>
                                {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
                            </select>
                        </div>
                        <FormInput label="Active Backlogs" type="number" min={0} placeholder="e.g. 0" error={step1.formState.errors.backlogs?.message} {...step1.register('backlogs', { valueAsNumber: true })} />
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button type="submit">Next →</Button>
                    </div>
                </form>
            )}

            {/* ── Step 2: Coding ── */}
            {step === 2 && (
                <form onSubmit={step2.handleSubmit(handleStep2)} className="flex flex-col gap-6">
                    <SectionHeader>Coding & GitHub Activity</SectionHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormInput label="LeetCode Submissions (total)" type="number" min={0} placeholder="e.g. 120" error={step2.formState.errors.lcSubmissions?.message} {...step2.register('lcSubmissions', { valueAsNumber: true })} />
                        <FormInput label="HackerRank/HackerEarth Badges" type="number" min={0} placeholder="e.g. 3" error={step2.formState.errors.hrBadges?.message} {...step2.register('hrBadges', { valueAsNumber: true })} />
                        <FormInput label="Med/Hard Questions Solved (HR/HE)" type="number" min={0} placeholder="e.g. 15" error={step2.formState.errors.hrMedHardSolved?.message} {...step2.register('hrMedHardSolved', { valueAsNumber: true })} />
                        <FormInput label="GitHub Contributions (last 1 year)" type="number" min={0} placeholder="e.g. 45" error={step2.formState.errors.githubContributions?.message} {...step2.register('githubContributions', { valueAsNumber: true })} />
                        <FormInput label="GitHub Collaborations" type="number" min={0} placeholder="e.g. 2" error={step2.formState.errors.githubCollaborations?.message} {...step2.register('githubCollaborations', { valueAsNumber: true })} />
                    </div>
                    <Toggle
                        label="Monthly GitHub activity (≥1 commit/month for 6 months)?"
                        checked={step2.watch('githubMonthlyActive')}
                        onChange={(v) => step2.setValue('githubMonthlyActive', v)}
                    />
                    <InfoNote>Self-reported — we don't verify handles in V1. Please enter accurate values.</InfoNote>
                    <div className="flex justify-between mt-4">
                        <Button variant="outline" type="button" onClick={() => setStep(1)}>← Back</Button>
                        <Button type="submit">Next →</Button>
                    </div>
                </form>
            )}

            {/* ── Step 3: Experience ── */}
            {step === 3 && (
                <form onSubmit={step3.handleSubmit(handleStep3)} className="flex flex-col gap-6">
                    <SectionHeader>Internships, Projects & Achievements</SectionHeader>

                    <SubSection title="Internships">
                        <div className="flex flex-col gap-1 sm:col-span-2">
                            <label className="text-sm font-medium text-slate-700">Internship Type</label>
                            <select className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" {...step3.register('internshipType')}>
                                {INTERNSHIP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <FormInput label="Count" type="number" min={0} placeholder="e.g. 1" error={step3.formState.errors.internshipCount?.message} {...step3.register('internshipCount', { valueAsNumber: true })} />
                        <div className="flex items-end pb-1">
                            <Toggle label="Stipend ≥ ₹10,000/month?" checked={step3.watch('internshipStipendAbove10k')} onChange={(v) => step3.setValue('internshipStipendAbove10k', v)} />
                        </div>
                    </SubSection>

                    <SubSection title="Projects">
                        <FormInput label="Industry/SIH/GOI Projects" type="number" min={0} placeholder="e.g. 1" error={step3.formState.errors.projectsIndustry?.message} {...step3.register('projectsIndustry', { valueAsNumber: true })} />
                        <FormInput label="Domain-Specific Projects" type="number" min={0} placeholder="e.g. 2" error={step3.formState.errors.projectsDomain?.message} {...step3.register('projectsDomain', { valueAsNumber: true })} />
                    </SubSection>

                    <SubSection title="Certifications">
                        <FormInput label="Global Certs (AWS/Azure/GCP etc.)" type="number" min={0} {...step3.register('certsGlobal', { valueAsNumber: true })} />
                        <FormInput label="NPTEL Courses (max 2 counted)" type="number" min={0} max={2} {...step3.register('certsNptel', { valueAsNumber: true })} />
                        <FormInput label="RBU Online Courses (max 2 counted)" type="number" min={0} max={2} {...step3.register('certsRbu', { valueAsNumber: true })} />
                    </SubSection>

                    <SubSection title="Hackathons & Competitions">
                        <FormInput label="1st Prize Wins" type="number" min={0} {...step3.register('hackathonFirst', { valueAsNumber: true })} />
                        <FormInput label="2nd Prize Wins" type="number" min={0} {...step3.register('hackathonSecond', { valueAsNumber: true })} />
                        <FormInput label="3rd / Consolation" type="number" min={0} {...step3.register('hackathonThird', { valueAsNumber: true })} />
                        <FormInput label="Participations" type="number" min={0} {...step3.register('hackathonParticipation', { valueAsNumber: true })} />
                    </SubSection>

                    <div className="flex justify-between mt-4">
                        <Button variant="outline" type="button" onClick={() => setStep(2)}>← Back</Button>
                        <Button type="submit">Next →</Button>
                    </div>
                </form>
            )}

            {/* ── Step 4: Resume ── */}
            {step === 4 && (
                <div className="flex flex-col gap-6">
                    <SectionHeader>Upload Your Resume</SectionHeader>
                    <FileDropzone
                        file={resumeFile}
                        onFileChange={setResumeFile}
                        error={submitAnalysis.isError ? "We couldn't extract text from this PDF. Please try a different file." : undefined}
                    />
                    <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-500">
                        <p className="font-medium text-slate-700 mb-1">What we store</p>
                        <ul className="list-disc ml-4 space-y-1 text-xs">
                            <li>Your resume text is parsed and immediately deleted — we never store the PDF.</li>
                            <li>Only anonymised feature scores are saved for model improvement.</li>
                            <li>Your name and email are stored separately and encrypted.</li>
                        </ul>
                    </div>
                    <div className="flex justify-between mt-4">
                        <Button variant="outline" type="button" onClick={() => setStep(3)}>← Back</Button>
                        <Button
                            onClick={handleFinalSubmit}
                            disabled={!resumeFile || submitAnalysis.isPending}
                            isLoading={submitAnalysis.isPending}
                        >
                            Analyse My Profile 🚀
                        </Button>
                    </div>
                    {submitAnalysis.isError && (
                        <p className="text-sm text-red-500 text-center">
                            Submission failed. Please check your connection and try again.
                        </p>
                    )}
                </div>
            )}
        </PageLayout>
    )
}
