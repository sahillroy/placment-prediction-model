# UX Screen Breakdown — CampusHire Advisor
**Version:** 1.0
**Stack:** React 18 + Vite + Tailwind CSS
**Based On:** PRD v1.1 | TRD v1.1
**Date:** February 2026

---

## Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Minimal** | Only display what's needed per step. No decorative chrome. |
| **Progressive disclosure** | Multi-step form reveals fields one section at a time |
| **Data-forward results** | Numbers are primary; labels are secondary |
| **Actionable always** | Every screen has at least one clear next action |
| **Responsive** | Mobile-first (375px) → desktop (1280px) via Tailwind breakpoints |

**Color System (Tailwind)**
- Primary: `indigo-600` (actions, CTAs)
- Success: `emerald-500` (good scores)
- Warning: `amber-500` (medium scores)
- Danger: `red-500` (low scores, errors)
- Neutral: `slate-` scale for text/backgrounds

---

## Screen List

| # | Screen | Route | Auth Required |
|---|--------|-------|---------------|
| S1 | Landing / Home | `/` | No |
| S2 | Register | `/register` | No |
| S3 | Login | `/login` | No |
| S4 | Profile Wizard | `/profile` | Yes |
| S5 | Results Dashboard | `/results/:id` | Yes |
| S6 | What-If Simulator | `/whatif/:id` | Yes |

---

## S1 — Landing / Home

### Purpose
Convert visitor to registered user. Explain value prop in under 10 seconds.

### Layout Hierarchy
```
<Page>
  <Navbar>                         — logo left, Login + Register buttons right
  <Hero>                           — centered, max-w-2xl
    <h1>Know your placement odds   — text-4xl font-bold
    <p>One-liner subheading        — text-lg text-slate-500
    <CTAButton> Get Started        — indigo-600, full-width on mobile
  <FeatureStrip>                   — 3-col grid (How it works)
    <FeatureCard> Upload Resume
    <FeatureCard> Add CP Handles
    <FeatureCard> Get Your Score
  <SampleResultPreview>            — blurred/mocked result card to build trust
  <Footer>                         — Privacy Policy | Consent info
```

### Components
- `Navbar` — sticky top, `h-16`, transparent → `bg-white/90 backdrop-blur` on scroll
- `HeroSection` — single column centered
- `FeatureCard` — icon + title + 1-line description, `rounded-xl border border-slate-100`
- `SamplePreview` — static blurred card, label "Sample Output — your real results here"

### Interaction Logic
- "Get Started" → `/register`
- "Login" → `/login`
- No form, no inputs on this page

### Empty State
- N/A (no data-driven content)

### Error State
- N/A

---

## S2 — Register

### Purpose
Create account with minimally required fields.

### Layout Hierarchy
```
<AuthLayout>                        — centered card, max-w-md, py-12
  <Logo>
  <h1> Create your account
  <Form onSubmit={handleRegister}>
    <Input> Full Name
    <Input type="email"> College Email
    <Input type="password"> Password
    <Input type="password"> Confirm Password
    <ConsentCheckbox>               — "I agree to my data being stored anonymously..."
    <SubmitButton> Create Account   — disabled until consent checked
  <Link> Already have an account? Login
```

### Components
- `AuthCard` — `bg-white rounded-2xl shadow-sm p-8 border border-slate-100`
- `FormInput` — label above, error message below in `text-red-500 text-sm`
- `ConsentCheckbox` — required; links to Privacy Policy in new tab
- `SubmitButton` — `bg-indigo-600 hover:bg-indigo-700` full-width

### Interaction Logic
- All fields validated inline on blur (React Hook Form + Zod)
- Password: min 8 chars, one uppercase, one number
- Submit → `POST /api/v1/auth/register` → redirect to `/profile`
- On success, store returned JWT in `httpOnly` cookie (handled by API)

### Empty State
- Form starts blank; no pre-filled values

### Error States
| Trigger | Message |
|---------|---------|
| Email already exists | `"An account with this email already exists."` below email field |
| Password mismatch | `"Passwords do not match."` below confirm field |
| Network error | Toast: `"Registration failed. Please try again."` |
| Consent not checked | Submit button stays disabled; no error message needed |

---

## S3 — Login

### Layout Hierarchy
```
<AuthLayout>                        — same as Register
  <Logo>
  <h1> Welcome back
  <Form onSubmit={handleLogin}>
    <Input type="email"> Email
    <Input type="password"> Password
    <ForgotPasswordLink>            — right-aligned, text-sm (non-functional V1)
    <SubmitButton> Log In
  <Link> Don't have an account? Register
```

### Components
- Same `AuthCard`, `FormInput`, `SubmitButton` as S2

### Interaction Logic
- Submit → `POST /api/v1/auth/login` → redirect to `/profile`
- Rate limited: 5 attempts/min (backend); show lockout message if 429 received

### Error States
| Trigger | Message |
|---------|---------|
| Wrong credentials | `"Incorrect email or password."` as inline alert |
| Rate limited | `"Too many attempts. Please wait 1 minute."` |
| Network error | Toast: `"Login failed. Check your connection."` |

---

## S4 — Profile Wizard (Core Input)

### Purpose
Collect all inputs needed for analysis in a guided, low-friction multi-step form.

### Layout Hierarchy
```
<PageLayout>
  <ProgressBar>                     — 4 steps, top of page, indigo fill
  <WizardContainer max-w-2xl>
    <StepIndicator>                 — "Step 2 of 4 — Academic Details"

    [Step 1: Academic Profile]
      <SectionHeader> Academic Details
      <FormGrid 2-col>
        <Input> CGPA
        <Select> CGPA Scale (10 / 4)
        <Input> 10th Board %
        <Input> 12th Board %
        <Select> Branch
        <Select> Year
        <Input type="number"> Active Backlogs
      <NavigationButtons> [Back] [Next →]

    [Step 2: Coding Activity]
      <SectionHeader> Coding & GitHub Activity
      <FormGrid 2-col>
        <Input> LeetCode Submissions (total)
        <Input> HackerRank/HackerEarth Badges
        <Input> Med/Hard Qs Solved (HR/HE)
        <Input> GitHub Contributions (last 1 yr)
        <Input> GitHub Collaborations
        <Toggle> Monthly GitHub activity (≥1/month for 6 mo)?
      <InfoNote> "Self-reported — we don't verify handles in V1"
      <NavigationButtons> [← Back] [Next →]

    [Step 3: Experience & Achievements]
      <SectionHeader> Internships, Projects & More
      <Subsection> Internships
        <Select> Internship Type (International / IT Company / EduSkills / None)
        <Input type="number"> Count
        <Toggle> Stipend ≥ ₹10,000/month?
      <Subsection> Projects
        <Input> Industry/SIH/GOI Projects (count)
        <Input> Domain-specific Projects (count)
      <Subsection> Certifications
        <Input> Global Certs (AWS/Azure/GCP etc.)
        <Input> NPTEL Courses (max 2 counted)
        <Input> RBU Online Courses (max 2 counted)
      <Subsection> Hackathons
        <Input> 1st Prize wins
        <Input> 2nd Prize wins
        <Input> 3rd / Consolation wins
        <Input> Participations
      <NavigationButtons> [← Back] [Next →]

    [Step 4: Resume Upload]
      <SectionHeader> Upload Your Resume
      <FileDropzone>
        — Dashed border, "Drop PDF here or click to browse"
        — Max 5 MB, PDF only
        — On upload: show filename + file size + green checkmark
      <ConsentReview>               — summary of what data will be stored
      <SubmitButton> Analyse My Profile   — primary, full-width
      <NavigationButtons> [← Back]
```

### Components
| Component | Description |
|-----------|-------------|
| `ProgressBar` | 4 segments, `bg-indigo-600` fill, animated on step advance |
| `StepIndicator` | `"Step N of 4 — [Step Name]"` in `text-slate-500 text-sm` |
| `FormGrid` | `grid grid-cols-1 md:grid-cols-2 gap-4` |
| `SectionHeader` | `text-xl font-semibold text-slate-800 mb-4` |
| `FormInput` | Consistent: label above, helper text below (gray), error below (red) |
| `Toggle` | `<Switch>` component, indigo when ON |
| `FileDropzone` | Drag-and-drop zone; shows preview state after upload |
| `InfoNote` | `bg-slate-50 rounded-lg p-3 text-slate-500 text-sm flex gap-2` with ℹ icon |
| `NavigationButtons` | `flex justify-between mt-8`; Back = outline, Next = filled indigo |

### Interaction Logic
- Step validation on "Next" click — cannot advance with invalid fields
- Step 1–3 data persisted in React state (not API) until Step 4 submission
- File validation: MIME-type + size checked client-side before upload
- On "Analyse My Profile": `POST /api/v1/analyse` (multipart) → redirect to `/results/:id`
- Loading state: full-screen overlay with spinner + animated text (`"Parsing resume…"`, `"Running model…"`)

### Empty States
| Field | Placeholder |
|-------|-------------|
| CGPA | `"e.g. 7.8"` |
| LeetCode Submissions | `"e.g. 120"` |
| GitHub Contributions | `"e.g. 45"` |
| File Dropzone | `"Drop your PDF resume here or click to browse"` |

### Error States
| Trigger | Display |
|---------|---------|
| CGPA out of range | `"CGPA must be between 0 and 10 (or 0–4 on 4.0 scale)"` |
| Non-PDF file | Dropzone border turns red: `"Only PDF files are accepted"` |
| File > 5 MB | `"File too large. Max size is 5 MB."` |
| Scanned / image PDF | After submit: `"We couldn't extract text from this PDF. Please upload a text-based PDF."` → allow resubmit |
| API timeout (>20s) | `"Analysis is taking longer than expected. Please try again."` |
| Network error | Toast: `"Submission failed. Please check your connection."` |

---

## S5 — Results Dashboard

### Purpose
Show the complete analysis output: probability, matrix score, explanations, actions.

### Layout Hierarchy
```
<PageLayout>
  <PageHeader>
    <h1> Your Placement Analysis
    <ActionRow>
      <Button outline> Run What-If Simulation →
      <Button outline> Start Over

  <ResultsGrid layout="2-col on desktop, 1-col on mobile">

    [Left Column — Primary Scores]
      <ProbabilityCard>
        <GaugeChart> 0–100 arc chart, color-coded
        <ProbabilityNumber> "72%" — text-6xl font-bold
        <ConfidenceBand> "Confidence range: 65% – 79%"
        <ProbabilityLabel> "Above Average" / "At Risk" / "Strong"

      <MatrixScoreCard>
        <ScoreHeader> RBU Placement Matrix Score
        <TotalScore> "63 / 100"
        <CategoryBreakdown>         — 9 rows, each: label + progress bar + "X/Max"
          ├── 10th Percentage         4/5   ████░
          ├── 12th Percentage         4/5   ████░
          ├── CGPA                    3/5   ███░░
          ├── GitHub Profile          9/15  ██████░░░
          ├── Coding Platforms       14/20  ████████████░░░░
          ├── Internship Experience  10/10  ██████████
          ├── Certifications         10/15  ██████████░░░░░ (highlighted amber — gap)
          ├── Projects                5/15  █████░░░░░░░░░░ (highlighted red — gap)
          └── Hackathons              4/10  ████░░░░░░

    [Right Column — Insights & Actions]
      <ATSScoreCard>
        <ScoreNumber> "ATS Score: 68/100"
        <KeywordGaps>               — pill badges for missing keywords
          "React" "System Design" "Docker"

      <SHAPCard>
        <h2> Top Factors Influencing Your Score
        <HorizontalBarChart>        — 3 bars, positive=indigo, negative=red
          ├── LeetCode Submissions  +11.2
          ├── CGPA                   +9.1
          └── ATS Score              +6.4

      <ActionPlanCard>
        <h2> Recommended Actions
        <ActionItem priority="1">
          <PriorityBadge> #1
          <ActionText> "Complete 2 domain-specific projects"
          <Rationale> "Projects is your lowest matrix category (5/15)"
          <CategoryTag> 🏗 Projects
        <ActionItem priority="2">
          <ActionText> "Add React, Node.js to resume skills"
          <Rationale> "ATS keyword match is 32% below target"
          <CategoryTag> 📄 Resume
```

### Components
| Component | Description |
|-----------|-------------|
| `ProbabilityCard` | White card, gauge arc using Recharts `RadialBarChart` |
| `GaugeChart` | Arc from 0°–180°, color: red < 40, amber 40–65, emerald > 65 |
| `MatrixScoreCard` | `bg-white rounded-2xl p-6`; category rows use `ProgressBar` |
| `CategoryRow` | `flex items-center gap-4`: label (w-40) + bar (flex-1) + score (w-16 text-right) |
| `ProgressBar` | `h-2 rounded-full bg-slate-100`; fill colored by score % |
| `ATSScoreCard` | Score number + `KeywordPill` list in `flex-wrap gap-2` |
| `KeywordPill` | `bg-red-50 text-red-600 border border-red-200 rounded-full px-3 py-1 text-sm` |
| `SHAPCard` | Recharts `BarChart` (horizontal), tooltip on hover |
| `ActionItem` | `border-l-4 border-indigo-500 pl-4 py-3`; numbered badge top-right |
| `CategoryTag` | Small emoji + label tag `bg-slate-100 rounded text-xs px-2 py-0.5` |

### Interaction Logic
- Page loads with data from `GET /api/v1/analyse/:id`
- "Run What-If Simulation" → navigates to `/whatif/:id`
- "Start Over" → clears state, navigates to `/profile`
- Hovering SHAP bar shows tooltip: `"Feature: LeetCode Submissions | Value: 143 | Impact: +11.2%"`
- Category rows in Matrix — clicking row shows tooltip with scoring rubric details

### Empty State
- If user has no prior submission → redirect to `/profile`
- Loading state: skeleton cards while API fetches (3 gray placeholder cards)

### Error States
| Trigger | Display |
|---------|---------|
| Submission not found (404) | Full-page: "We couldn't find this result. It may have expired." + "Start Over" CTA |
| Low-confidence prediction | Info banner: "This profile is unusual — treat this estimate as approximate" |
| API error | Toast + "Retry" button |

---

## S6 — What-If Simulator

### Purpose
Let students edit individual fields and see how their probability and matrix score change.

### Layout Hierarchy
```
<PageLayout>
  <PageHeader>
    <h1> What-If Simulator
    <Breadcrumb> ← Back to Results

  <SimulatorLayout 2-col>

    [Left — Editable Inputs]
      <InputPanel>
        <SectionHeader> Adjust Your Inputs
        <InfoNote> "Edit any field and click Recalculate to see the impact"
        <EditableFieldGroup>        — same fields as Step 2 & 3 of wizard
          <EditableField> LeetCode Submissions  [current: 143] → [input]
          <EditableField> Projects (Domain)     [current: 1]   → [input]
          <EditableField> GitHub Contributions  [current: 45]  → [input]
          <EditableField> Global Certifications [current: 1]   → [input]
          ... (all matrix-scoring fields)
        <RecalculateButton>         — full-width, indigo

    [Right — Delta Results]
      <DeltaPanel>
        <OriginalVsNew>
          <ScoreBlock label="Original Probability"> 72%
          <ArrowIcon>                — →
          <ScoreBlock label="New Probability" highlighted> 78% ↑ +6%

        <MatrixDelta>
          <OriginalMatrix> 63/100
          <NewMatrix> 71/100 ↑ +8
          <CategoryDeltaList>       — only show changed categories
            Projects: 5 → 13  (+8)  ✅
            GitHub:   9 → 9   (—)

        <ActionHint>
          "Improving Projects alone adds +6% to your placement probability"
```

### Components
| Component | Description |
|-----------|-------------|
| `EditableField` | Shows current value + editable input side-by-side |
| `RecalculateButton` | `POST /api/v1/analyse/whatif`; shows spinner while loading |
| `ScoreBlock` | Large number in a rounded card; `highlight` variant has `ring-2 ring-indigo-500` |
| `DeltaBadge` | `↑ +6%` in `text-emerald-600 font-semibold` or `↓ -3%` in `text-red-500` |
| `CategoryDeltaRow` | Category name + old score + arrow + new score + delta badge |

### Interaction Logic
- Page initialises with original submission values pre-populated
- "Recalculate" sends only the edited fields + original `submission_id` to API
- `POST /api/v1/analyse/whatif` returns new `probability` + `matrix_score` + `matrix_breakdown`
- Delta computed client-side: `new - original`
- Only changed categories shown in CategoryDeltaList (others greyed/hidden)
- Can recalculate multiple times in one session

### Empty State
- Initial load: delta panel shows `"Edit a field and click Recalculate to see changes"`
- Before first recalculation: right panel is in an idle/placeholder state

### Error States
| Trigger | Display |
|---------|---------|
| Same values re-submitted | Info: `"No changes detected. Edit at least one field."` |
| API error | Toast: `"Recalculation failed. Please try again."` |
| Invalid field value | Inline red error below field |

---

## Global Components

### `Navbar` (authenticated)
```
<nav sticky top-0 bg-white border-b>
  Logo (left) | "CampusHire Advisor"
  Nav Links: Dashboard | History (V2)
  Avatar dropdown: Profile | Logout
```

### `Toast` Notification
- `fixed bottom-4 right-4`, auto-dismiss after 4s
- Variants: `success` (emerald), `error` (red), `info` (blue)

### `LoadingOverlay`
- Used during analysis submission (Step 4 → Results)
- Full screen `bg-white/80 backdrop-blur`
- Spinner + rotating status text: `"Parsing resume… → Extracting features… → Running model…"`

### `SkeletonCard`
- Used on Results page while data loads
- `animate-pulse bg-slate-100 rounded-2xl h-48`

---

## Responsive Behavior Summary

| Screen | Mobile (375px) | Tablet (768px) | Desktop (1280px) |
|--------|---------------|----------------|-----------------|
| S1 Landing | 1-col, hero stacked | 2-col features | 3-col features |
| S2/S3 Auth | Full-width card | Centered card | Centered card |
| S4 Wizard | 1-col fields | 2-col grid | 2-col grid |
| S5 Results | 1-col stacked | 1-col stacked | 2-col side-by-side |
| S6 What-If | 1-col stacked | 1-col stacked | 2-col side-by-side |

---

## Tailwind Theme Config (`tailwind.config.js`)

```js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          500: '#6366f1',   // indigo
          600: '#4f46e5',
          700: '#4338ca',
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
}
```

---

## Component File Map (`src/`)

```
src/
├── pages/
│   ├── Landing.jsx
│   ├── Register.jsx
│   ├── Login.jsx
│   ├── ProfileWizard.jsx
│   ├── Results.jsx
│   └── WhatIf.jsx
├── components/
│   ├── layout/
│   │   ├── Navbar.jsx
│   │   ├── AuthLayout.jsx
│   │   └── PageLayout.jsx
│   ├── charts/
│   │   ├── GaugeChart.jsx
│   │   └── SHAPBarChart.jsx
│   ├── results/
│   │   ├── ProbabilityCard.jsx
│   │   ├── MatrixScoreCard.jsx
│   │   ├── CategoryRow.jsx
│   │   ├── ATSScoreCard.jsx
│   │   ├── ActionPlanCard.jsx
│   │   └── ActionItem.jsx
│   ├── wizard/
│   │   ├── ProgressBar.jsx
│   │   ├── StepIndicator.jsx
│   │   └── FileDropzone.jsx
│   └── ui/
│       ├── Button.jsx
│       ├── FormInput.jsx
│       ├── Toggle.jsx
│       ├── Toast.jsx
│       ├── SkeletonCard.jsx
│       └── LoadingOverlay.jsx
├── hooks/
│   ├── useAnalysis.js        — React Query hook for /analyse
│   └── useAuth.js            — login, register, logout mutations
├── lib/
│   ├── api.js                — axios instance + interceptors
│   └── validators.js         — Zod schemas for each wizard step
└── App.jsx                   — routes: react-router-dom v6
```
