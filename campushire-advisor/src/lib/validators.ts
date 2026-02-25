import { z } from 'zod'

// ─── Step 1: Academic Profile ─────────────────────────────────────────────────
export const academicSchema = z.object({
    tenthPct: z
        .number({ required_error: 'Required' })
        .min(0).max(100, 'Must be 0–100'),
    twelfthPct: z
        .number({ required_error: 'Required' })
        .min(0).max(100, 'Must be 0–100'),
    cgpa: z
        .number({ required_error: 'Required' })
        .min(0, 'Must be ≥ 0'),
    cgpaScale: z.union([z.literal(10), z.literal(4)]),
    branch: z.string().min(1, 'Select a branch'),
    year: z.number().min(1).max(4),
    backlogs: z.number().min(0),
})

// ─── Step 2: Coding Activity ──────────────────────────────────────────────────
export const codingSchema = z.object({
    lcSubmissions: z.number().min(0),
    hrBadges: z.number().min(0),
    hrMedHardSolved: z.number().min(0),
    githubContributions: z.number().min(0),
    githubCollaborations: z.number().min(0),
    githubMonthlyActive: z.boolean(),
})

// ─── Step 3: Experience & Achievements ───────────────────────────────────────
export const experienceSchema = z.object({
    internshipType: z.enum(['international', 'it_company', 'eduskills', 'none']),
    internshipCount: z.number().min(0),
    internshipStipendAbove10k: z.boolean(),
    projectsIndustry: z.number().min(0),
    projectsDomain: z.number().min(0),
    certsGlobal: z.number().min(0),
    certsNptel: z.number().min(0).max(2),
    certsRbu: z.number().min(0).max(2),
    hackathonFirst: z.number().min(0),
    hackathonSecond: z.number().min(0),
    hackathonThird: z.number().min(0),
    hackathonParticipation: z.number().min(0),
})

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const registerSchema = z
    .object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Enter a valid email address'),
        password: z
            .string()
            .min(8, 'At least 8 characters')
            .regex(/[A-Z]/, 'Must contain an uppercase letter')
            .regex(/[0-9]/, 'Must contain a number'),
        confirmPassword: z.string(),
        consent: z.literal(true, {
            errorMap: () => ({ message: 'You must agree to continue' }),
        }),
    })
    .refine((d) => d.password === d.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    })

export const loginSchema = z.object({
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
})

export type AcademicFormValues = z.infer<typeof academicSchema>
export type CodingFormValues = z.infer<typeof codingSchema>
export type ExperienceFormValues = z.infer<typeof experienceSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
export type LoginFormValues = z.infer<typeof loginSchema>
