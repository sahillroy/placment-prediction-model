// ─── Auth ────────────────────────────────────────────────────────────────────
export interface User {
    id: string
    email: string
    name: string
}

export interface AuthState {
    user: User | null
    isAuthenticated: boolean
}

// ─── Profile / Wizard ────────────────────────────────────────────────────────
export interface AcademicProfile {
    cgpa: number
    cgpaScale: 10 | 4
    tenthPct: number
    twelfthPct: number
    branch: string
    year: number
    backlogs: number
}

export interface CodingActivity {
    lcSubmissions: number
    hrBadges: number
    hrMedHardSolved: number
    githubContributions: number
    githubCollaborations: number
    githubMonthlyActive: boolean
}

export type InternshipType = 'international' | 'it_company' | 'eduskills' | 'none'

export interface ExperienceAchievements {
    internshipType: InternshipType
    internshipCount: number
    internshipStipendAbove10k: boolean
    projectsIndustry: number
    projectsDomain: number
    certsGlobal: number
    certsNptel: number
    certsRbu: number
    hackathonFirst: number
    hackathonSecond: number
    hackathonThird: number
    hackathonParticipation: number
}

export interface WizardFormData {
    academic: AcademicProfile
    coding: CodingActivity
    experience: ExperienceAchievements
    resumeFile: File | null
}

// ─── Analysis Results ─────────────────────────────────────────────────────────
export interface ShapContribution {
    feature: string
    value: number
    contribution: number
}

export interface Action {
    priority: number
    action: string
    rationale: string
    category: string
}

export interface CategoryScore {
    earned: number
    max: number
}

export interface MatrixBreakdown {
    tenth_pct: CategoryScore
    twelfth_pct: CategoryScore
    cgpa: CategoryScore
    github: CategoryScore
    coding_platform: CategoryScore
    internship: CategoryScore
    certifications: CategoryScore
    projects: CategoryScore
    hackathons: CategoryScore
}

export interface AnalysisResult {
    submissionId: string
    probability: number
    confidenceBand: [number, number]
    atsScore: number
    keywordGaps: string[]
    matrixScore: number
    matrixBreakdown: MatrixBreakdown
    shapContributions: ShapContribution[]
    actions: Action[]
    processingMs: number
}

// ─── API Responses ────────────────────────────────────────────────────────────
export interface ApiError {
    detail: string
    status: number
}
