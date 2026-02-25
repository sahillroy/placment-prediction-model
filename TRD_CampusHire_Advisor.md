# Technical Requirement Document — CampusHire Advisor
**Version:** 1.1 (MVP)
**Date:** February 2026
**Based On:** PRD v1.1
**Status:** Updated — Placement Matrix Score integrated

---

## 1. System Architecture Overview

CampusHire Advisor follows a **3-tier, monolith-first architecture** — a single FastAPI backend serving a React frontend, with a PostgreSQL database. The ML pipeline runs as a subprocess within the same backend process (no separate microservice in V1).

```
┌─────────────────────────────────────────────────┐
│                   Browser (React)               │
│   Form → PDF Upload → Results Dashboard         │
└───────────────────┬─────────────────────────────┘
                    │ HTTPS (REST + multipart)
┌───────────────────▼─────────────────────────────┐
│              FastAPI Backend (Python)            │
│  ┌──────────────┐  ┌───────────────────────────┐│
│  │ Auth Layer   │  │  API Routers               ││
│  │ (JWT)        │  │  /auth /profile /analyse   ││
│  └──────────────┘  └──────────┬────────────────┘│
│  ┌──────────────────────────  │  ──────────────┐│
│  │        ML Pipeline         │                ││
│  │  ResumeParser → FeatureEng → XGBoost+BERT   ││
│  │              → SHAP → RecommendationEngine  ││
│  └────────────────────────────────────────────┘│
│  ┌───────────────┐  ┌────────────────────────┐ │
│  │ File Storage  │  │  PostgreSQL DB          │ │
│  │ (local /tmp   │  │  (Users, Submissions,   │ │
│  │  or S3 V2)   │  │   AnonymisedFeatures)   │ │
│  └───────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Key Design Decisions
- **Monolith-first**: No microservices in V1. Reduces ops overhead for a small team.
- **Sync inference**: ML model runs synchronously per request. Acceptable under < 50 concurrent users.
- **No message queue** in V1: Not needed at this scale. Add Celery + Redis in V2 if inference > 10s.
- **Stateless API**: JWT tokens carry session; server holds no session state.

---

## 2. Frontend Responsibilities

**Stack:** React 18 + Vite, React Query, React Hook Form, Recharts

### Pages & Components

| Page | Responsibility |
|------|---------------|
| `/register` & `/login` | Auth forms; JWT stored in `httpOnly` cookie |
| `/profile` | Multi-step form: Academic → Resume Upload → Contest Handles → Consent |
| `/results` | Probability gauge, SHAP bar chart, ATS score card, action recommendation cards |
| `/whatif` | Inline edit of any field + "Recalculate" → shows delta |

### Frontend Rules
- **Form validation** happens client-side (React Hook Form + Zod) before any API call.
- **File validation**: PDF-only, ≤ 5 MB enforced in browser before upload.
- **Loading state**: Show skeleton UI + progress indicator during the ≤ 20s analysis window.
- **Error states**: Network errors, parse failures, and model errors each have a distinct user-facing message.
- **No localStorage for PII**: JWT stored in `httpOnly` cookie only; no raw tokens in `localStorage`.
- **Responsive**: Works at 375px (mobile) and 1280px (desktop). No dedicated mobile app.

### State Management
- **React Query** for all server state (submissions, results).
- **Local React state** for form wizard steps.
- No Redux or Zustand — overkill for V1 scope.

---

## 3. Backend Responsibilities

**Stack:** Python 3.11, FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2

### Services / Modules

```
backend/
├── api/
│   ├── auth.py           # Register, login, logout
│   ├── profile.py        # CRUD on student profile
│   └── analyse.py        # Core: receive inputs → run pipeline → return results
├── ml/
│   ├── resume_parser.py  # pdfplumber extraction + spaCy NER
│   ├── ats_scorer.py     # Keyword match against JD corpus
│   ├── matrix_scorer.py  # Deterministic RBU CDPC rubric scorer (100 pts)
│   ├── feature_eng.py    # Normalise + assemble feature vector (includes matrix)
│   ├── model.py          # Load XGBoost + BERT; run inference
│   ├── explainer.py      # SHAP TreeExplainer wrapper
│   └── recommender.py    # Rule-based action engine (informed by matrix gaps)
├── db/
│   ├── models.py         # SQLAlchemy ORM models
│   └── session.py        # Async session factory
├── core/
│   ├── config.py         # Env vars via Pydantic Settings
│   ├── security.py       # JWT creation/validation
│   └── exceptions.py     # Custom HTTP exceptions
└── main.py               # FastAPI app + CORS + router mount
```

### Inference Pipeline (per request)
```
POST /api/analyse
  1. Validate inputs (Pydantic)
  2. Save uploaded PDF to /tmp/<uuid>.pdf
  3. resume_parser.extract(pdf_path) → raw_text, sections
  4. ats_scorer.score(raw_text) → ats_score, keyword_gaps
  5. matrix_scorer.compute(profile) → matrix_score (0–100), category_breakdown
  6. feature_eng.build_vector(profile, cp_data, ats_score, matrix_score) → feature_vector
  7. model.predict(feature_vector, raw_text) → probability, confidence_interval
  8. explainer.top3(feature_vector) → shap_contributions
  9. recommender.generate(shap_contributions, keyword_gaps, category_breakdown) → actions
  10. Persist anonymised feature vector + matrix_score to DB (no PII)
  11. Return JSON response
  12. Delete /tmp/<uuid>.pdf
```

### Background Tasks
- None in V1. If inference occasionally exceeds 20s, move step 3–8 to `BackgroundTasks` with polling endpoint in V2.

---

## 4. Database Schema

**Engine:** PostgreSQL 15 via asyncpg. Migrations managed with Alembic.

### Tables

#### `users`
```sql
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT UNIQUE NOT NULL,
    hashed_pw   TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now(),
    consent     BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at  TIMESTAMPTZ                        -- soft delete (RTBF)
);
```

#### `student_profiles`
```sql
CREATE TABLE student_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
    branch              TEXT NOT NULL,
    year                SMALLINT NOT NULL,
    -- Academic
    tenth_pct           NUMERIC(5,2),              -- 10th board percentage
    twelfth_pct         NUMERIC(5,2),              -- 12th board percentage
    cgpa                NUMERIC(4,2) NOT NULL,
    cgpa_scale          NUMERIC(4,2) NOT NULL DEFAULT 10.0,
    backlogs            SMALLINT DEFAULT 0,
    -- GitHub (for matrix scoring)
    github_handle       TEXT,
    github_contributions SMALLINT DEFAULT 0,       -- last 1 year
    github_collaborations SMALLINT DEFAULT 0,
    github_monthly_active BOOLEAN DEFAULT FALSE,   -- min 1/month for 6 months
    -- Coding Platforms (self-reported)
    lc_submissions      SMALLINT DEFAULT 0,        -- LeetCode total submissions
    hr_badges           SMALLINT DEFAULT 0,        -- HackerRank/HackerEarth badges
    hr_med_hard_solved  SMALLINT DEFAULT 0,        -- Med/Hard questions
    -- Internships
    internship_count    SMALLINT DEFAULT 0,
    internship_type     TEXT[],                    -- ['international','it_company','eduskills']
    internship_stipend_above_10k BOOLEAN DEFAULT FALSE,
    -- Projects
    projects_industry   SMALLINT DEFAULT 0,        -- SIH/GOI/Industry-mentored
    projects_domain     SMALLINT DEFAULT 0,        -- Domain-specific outside curriculum
    -- Certifications
    certs_global        SMALLINT DEFAULT 0,        -- AWS/Azure/GCP/CISCO/IBM/Redhat
    certs_nptel         SMALLINT DEFAULT 0,        -- max counted: 2
    certs_rbu           SMALLINT DEFAULT 0,        -- max counted: 2
    -- Hackathons
    hackathon_first     SMALLINT DEFAULT 0,
    hackathon_second    SMALLINT DEFAULT 0,
    hackathon_third     SMALLINT DEFAULT 0,
    hackathon_participation SMALLINT DEFAULT 0,
    updated_at          TIMESTAMPTZ DEFAULT now()
);
```

#### `submissions`
```sql
CREATE TABLE submissions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ DEFAULT now(),
    probability         NUMERIC(5,2) NOT NULL,
    confidence_low      NUMERIC(5,2),
    confidence_high     NUMERIC(5,2),
    ats_score           NUMERIC(5,2),
    matrix_score        NUMERIC(5,2),              -- /100, RBU CDPC rubric
    matrix_breakdown    JSONB,                     -- {category: {earned, max}} per category
    shap_json           JSONB,                     -- [{feature, value, contribution}]
    actions_json        JSONB,                     -- [{priority, action, rationale, category}]
    is_whatif           BOOLEAN DEFAULT FALSE
);
```

#### `anonymised_features` *(for model retraining only)*
```sql
CREATE TABLE anonymised_features (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id   UUID REFERENCES submissions(id),
    feature_vector  JSONB NOT NULL,               -- No name/email; aggregate signals only
    placed_label    BOOLEAN,                      -- filled post-placement by admin
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

### Key Schema Decisions
- **UUID everywhere**: avoids sequential ID enumeration attacks.
- **Soft delete on `users`**: `deleted_at` supports Right-to-be-Forgotten without cascade complexity.
- **JSONB for SHAP/actions**: flexible, no schema churn as model evolves.
- **No resume text stored**: parse → feature → delete file. Only anonymised vectors persisted.

---

## 5. API Structure

**Base URL:** `/api/v1`
**Format:** JSON (multipart for file upload)
**Auth:** Bearer JWT in `Authorization` header

### Endpoints

#### Auth
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Register with email + password |
| `POST` | `/auth/login` | Returns access token (15 min) + refresh token (7 days) |
| `POST` | `/auth/refresh` | Issue new access token using refresh token |
| `POST` | `/auth/logout` | Revoke refresh token |

#### Profile
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/profile/me` | Get current user's profile |
| `PUT` | `/profile/me` | Update academic + CP fields |
| `DELETE` | `/profile/me` | Soft-delete user (RTBF) |

#### Analysis
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/analyse` | Multipart: profile JSON + PDF file → runs full pipeline → returns result |
| `GET` | `/analyse/history` | Last 10 submissions for the logged-in user |
| `GET` | `/analyse/{submission_id}` | Retrieve a past result |
| `POST` | `/analyse/whatif` | JSON only (no PDF); re-runs model with edited fields |

### Response Shape — `/analyse` (POST)
```json
{
  "submission_id": "uuid",
  "probability": 72.4,
  "confidence_band": [65.1, 79.7],
  "ats_score": 68.0,
  "keyword_gaps": ["React", "System Design", "Docker"],
  "matrix_score": 63.0,
  "matrix_breakdown": {
    "tenth_pct":      { "earned": 4, "max": 5 },
    "twelfth_pct":    { "earned": 4, "max": 5 },
    "cgpa":           { "earned": 3, "max": 5 },
    "github":         { "earned": 9, "max": 15 },
    "coding_platform":{ "earned": 14, "max": 20 },
    "internship":     { "earned": 10, "max": 10 },
    "certifications": { "earned": 10, "max": 15 },
    "projects":       { "earned": 5,  "max": 15 },
    "hackathons":     { "earned": 4,  "max": 10 }
  },
  "shap_contributions": [
    { "feature": "lc_submissions", "value": 143, "contribution": +11.2 },
    { "feature": "cgpa_normalised", "value": 0.75, "contribution": +9.1 },
    { "feature": "ats_score", "value": 68.0, "contribution": +6.4 }
  ],
  "actions": [
    { "priority": 1, "action": "Complete 2 more domain-specific projects to boost Projects score from 5→13", "rationale": "Projects is your lowest-scoring matrix category (5/15)", "category": "projects" },
    { "priority": 2, "action": "Add 'React' and 'Node.js' to your resume skills section", "rationale": "ATS keyword match is 32% below target", "category": "ats" }
  ],
  "processing_ms": 4820
}
```

### Error Codes
| Code | Scenario |
|------|----------|
| `400` | Validation failure (bad CGPA, missing fields) |
| `413` | Resume > 5 MB |
| `415` | Non-PDF upload |
| `422` | Resume text extraction failed (scanned PDF) |
| `429` | Rate limit exceeded |
| `500` | Model inference error (fallback message shown) |

---

## 6. Authentication Strategy

- **Mechanism:** JWT (access + refresh token pair).
- **Access token TTL:** 15 minutes (short-lived to limit stolen token exposure).
- **Refresh token TTL:** 7 days; stored server-side in `refresh_tokens` table for revocation.
- **Storage:** Tokens sent via `httpOnly`, `SameSite=Strict` cookies — **not** `localStorage`.
- **Password hashing:** `bcrypt` with cost factor 12.
- **Rate limiting:** `/auth/login` limited to 5 attempts / minute per IP (via `slowapi`).
- **No OAuth in V1:** Keep it simple. Add Google SSO (for college email) in V2 if needed.

### Refresh Token Table
```sql
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT UNIQUE NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN DEFAULT FALSE
);
```

---

## 7. Third-Party Dependencies

### Backend (Python)

| Package | Purpose | Pinned Version |
|---------|---------|----------------|
| `fastapi` | Web framework | 0.111.x |
| `uvicorn[standard]` | ASGI server | 0.29.x |
| `sqlalchemy[asyncio]` | ORM | 2.0.x |
| `asyncpg` | Async Postgres driver | 0.29.x |
| `alembic` | DB migrations | 1.13.x |
| `pydantic[email]` | Validation + settings | 2.x |
| `pdfplumber` | PDF text extraction | 0.10.x |
| `spacy` (en_core_web_sm) | NLP / NER for resume | 3.7.x |
| `sentence-transformers` | BERT resume embeddings | 2.7.x |
| `xgboost` | Tabular placement model | 2.0.x |
| `shap` | Explainability | 0.45.x |
| `slowapi` | Rate limiting | 0.1.x |
| `passlib[bcrypt]` | Password hashing | 1.7.x |
| `python-jose[cryptography]` | JWT | 3.3.x |
| `python-multipart` | File upload parsing | 0.0.9 |

### Frontend (Node/npm)

| Package | Purpose |
|---------|---------|
| `react` + `vite` | UI framework + bundler |
| `react-query` | Server state management |
| `react-hook-form` + `zod` | Form + validation |
| `recharts` | SHAP bar chart + probability gauge |
| `axios` | HTTP client |
| `tailwindcss` | Utility CSS (alternative: plain CSS) |

### Infrastructure (V1 — minimal)

| Tool | Purpose |
|------|---------|
| PostgreSQL 15 | Primary database |
| Docker + Docker Compose | Local dev + deployment |
| Nginx | Reverse proxy (serve React static + proxy `/api`) |
| GitHub Actions | CI: lint, test, build |

---

## 8. Scalability Considerations

> V1 targets < 50 concurrent users. Architecture is designed to **extend cleanly**, not to pre-optimise.

### What handles growth without rework

| Concern | V1 Approach | V2 Upgrade Path |
|---------|------------|-----------------|
| **Inference latency** | Sync, in-process | Move to Celery + Redis task queue; poll or WebSocket |
| **File storage** | Local `/tmp` (deleted post-parse) | S3-compatible object store (MinIO or AWS S3) |
| **Model updates** | Restart server with new model file | Model registry (MLflow) + blue-green deploy |
| **Database** | Single Postgres instance | Read replica + connection pooling (PgBouncer) |
| **Auth** | Custom JWT | Plug in Auth0 / Supabase Auth without touching business logic |
| **Rate limiting** | In-process `slowapi` | Redis-backed rate limiter (cluster-safe) |
| **Caching** | None | Cache SHAP explanations for identical feature vectors (Redis) |

### What NOT to build now
- No Kubernetes, no service mesh, no event bus — premature for < 50 users.
- No CDN — static React bundle is small; add CloudFront when traffic scales.
- No async inference queue — add only if P95 latency > 15s in load testing.

---

## 9. Security Baseline (V1)

| Control | Implementation |
|---------|---------------|
| HTTPS only | Nginx enforces TLS; HTTP redirected |
| CORS | Whitelist only frontend origin |
| SQL injection | SQLAlchemy ORM (parameterised queries) |
| File upload | MIME-type + magic-byte check; virus scan skipped (V1) |
| PII separation | Name/email in `users`; no PII in `anonymised_features` |
| Secrets | `.env` file (never committed); Docker secrets in prod |
| Dependency audit | `pip-audit` + `npm audit` in CI |

---

## 10. Environment Configuration

```env
# Backend .env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/campushiredb
SECRET_KEY=<32-byte-random>
REFRESH_SECRET_KEY=<32-byte-random>
MODEL_PATH=./ml/artifacts/model_v1.joblib
BERT_MODEL=all-MiniLM-L6-v2
MAX_RESUME_SIZE_MB=5
ALLOWED_ORIGINS=http://localhost:5173,https://campushireadvisor.com
ENVIRONMENT=development
```

---

## 11. Developer Setup (Quick Reference)

```bash
# Clone & setup
git clone <repo>
cd backend && python -m venv venv && pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Database
docker compose up -d postgres
alembic upgrade head

# Run backend
uvicorn main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev
```

---

## 12. Open Technical Decisions

| # | Decision | Recommendation |
|---|----------|---------------|
| T1 | What-if re-analysis: server-side re-run vs local SHAP approximation? | **Server-side re-run** — simpler, accurate; only adds ~2s |
| T2 | BERT model size: `all-MiniLM-L6-v2` (80 MB) vs `paraphrase-mpnet` (420 MB)? | **MiniLM** for V1 — fits CPU SLA; upgrade if accuracy lags |
| T3 | File storage in prod: local vs S3? | **Local + immediate delete** in V1; S3 only if audit trail needed |
| T4 | Model retraining trigger: manual vs scheduled? | **Manual** in V1 — too few data points for auto-retrain to be meaningful |
