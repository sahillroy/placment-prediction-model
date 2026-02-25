# Product Requirement Document — CampusHire Advisor
**Version:** 1.1 (MVP)
**Date:** February 2026
**Status:** Updated — Placement Matrix Score added

---

## 1. Problem Statement

Campus placement cells in Indian colleges use CGPA as the primary — often sole — signal of student employability. This misses high-signal indicators such as competitive programming ratings, GitHub project quality, and resume readability. As a result:

- Students don't know **where to invest time** before placement season.
- Placement officers can't identify **at-risk students** early enough to intervene.
- Decisions remain subjective and coarse-grained.

**CampusHire Advisor** solves this by combining multiple employability signals into a single calibrated placement probability (0–100%) with transparent, actionable explanations.

---

## 2. Target Users

### Primary — Final-Year Undergraduate Students
- Preparing for campus placements (product, SWE, analytics roles).
- Actively seeking clarity on their competitive standing.
- Pain: don't know what to improve or how urgently.

### Secondary — College Placement Officers / Career Counsellors
- Want to identify students who need mentoring early.
- Need aggregate cohort-level insight, not just individual predictions.
- Pain: manually reviewing hundreds of resumes and profiles.

> **V1 focuses exclusively on the student user.** Placement officer dashboard is roadmap.

---

## 3. Core User Flows (MVP)

### Flow 1 — Profile + Resume Submission
```
Student signs up / logs in
  → Fills profile form (name, branch, year, CGPA, backlogs, internship count)
  → Uploads resume (PDF, ≤5 MB)
  → Optionally enters contest handles (LeetCode, Codeforces, CodeChef, GitHub)
  → Clicks "Analyse My Profile"
  → System processes (≤20s) → Results page shown
```

### Flow 2 — Results Page
```
Results page shows:
  ├── Placement Probability (0–100%) with confidence band
  ├── Placement Matrix Score (/100) — RBU CDPC rubric breakdown
  ├── Top 3 features driving the score (SHAP-based)
  ├── Resume ATS Score (0–100) with keyword gaps highlighted
  └── 2–3 Prioritized Action Items (specific, time-bound)
```

### Flow 3 — Re-analysis (optional, same session)
```
Student edits one field (e.g., raises LeetCode count by 30)
  → Clicks "Recalculate"
  → New probability shown with delta (↑ or ↓)
```

---

## 4. Feature List

### MVP (V1) — Must Have

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Student Profile Form** | CGPA, 10th %, 12th %, branch, year, backlog count, internship count/type, projects count, hackathon prizes, certifications count |
| F2 | **Resume Upload + Parser** | PDF upload; extract sections, keyword list, ATS score (0–100) |
| F3 | **Contest Handle Input** | Self-reported: LeetCode submissions, HackerRank/HackerEarth badges + medium/hard questions, GitHub contributions/collaborations |
| F4 | **Feature Extraction Pipeline** | Maps inputs → numeric feature vector for model + computes RBU matrix score |
| F5 | **Placement Probability Model** | XGBoost (tabular) + Sentence-BERT (resume); outputs 0–100% |
| F6 | **Placement Matrix Score** | Rule-based computation of RBU CDPC rubric (/100): 10th, 12th, CGPA, GitHub, Coding Platforms, Internships, Certifications, Projects, Hackathons |
| F7 | **SHAP Explainability** | Top-3 feature contributions displayed per prediction |
| F8 | **Action Plan Engine** | Rule-based: generates 2–3 specific, prioritized recommendations tied to lowest-scoring matrix categories |
| F9 | **Results Dashboard (UI)** | Probability gauge, Matrix score breakdown, SHAP chart, ATS score, action cards |
| F10 | **Consent + Privacy** | Explicit checkbox before analysis; anonymized feature storage only |
| F11 | **Re-analysis / What-if** | Edit one input, re-run model + matrix, show probability and matrix delta |

---

### Roadmap (V2+) — Not in V1

| Feature | Phase |
|---------|-------|
| Auto-scrape CP profiles (LeetCode API, CF API) | V2 |
| GitHub activity analysis (commits, stars, repo topics) | V2 |
| SHAP waterfall chart (visual deep-dive) | V2 |
| Personalized 30-day learning plan | V2 |
| Audio mock interview + communication score | V3 |
| Placement officer cohort dashboard | V3 |
| LMS / SSO integration | V3 |
| A/B measurement of recommendations vs placement outcomes | V3 |

---

## 5. Edge Cases

| Scenario | Handling |
|----------|----------|
| Resume is scanned image (non-text PDF) | Show warning: "We couldn't extract text. Please upload a text-based PDF." Fallback to manual-only mode. |
| Student has no contest handles | Handles treated as 0; model trained to handle missing CP features gracefully. |
| CGPA on 10.0 vs 4.0 scale | Form asks for scale; normalise at input. |
| Resume > 5 MB | Reject with clear error message before upload. |
| Unsupported file type (DOCX, PNG) | Reject; prompt PDF only. |
| All fields blank on submission | Inline validation; prevent submission. |
| Contest rating entered as 0 | Treat same as "no CP activity"; not penalised if handle not provided. |
| Two resumes uploaded | Only latest upload retained per session. |
| Model confidence is very low (e.g., very unusual profile) | Show probability with a wider confidence band; add note: "Limited data for your profile — treat this as a rough estimate." |
| User refreshes results page | Re-display last computed result from session; no re-computation needed. |

---

## 6. Non-Goals (V1)

- ❌ No auto-scraping of LeetCode / Codeforces (legal / rate-limit risk; fallback = self-reported)
- ❌ No real-time job matching or company-specific predictions
- ❌ No audio/video interview analysis
- ❌ No placement officer dashboard or admin panel
- ❌ No mobile app (web responsive is sufficient)
- ❌ No integration with any college LMS or ERP
- ❌ No social/sharing features
- ❌ No payment or premium tier
- ❌ No chatbot or conversational interface

---

## 7. Success Metrics

### Model Quality
| Metric | Target |
|--------|--------|
| ROC-AUC | ≥ 0.80 |
| F1 Score (placed class) | ≥ 0.75 |
| Expected Calibration Error (ECE) | ≤ 0.08 |
| Placement Matrix Score RMSE | ≤ 5 points (vs manual committee score) |
| Fairness: TPR disparity across branches/gender | < 10% |

### Product / UX
| Metric | Target |
|--------|--------|
| End-to-end response time | ≤ 20 seconds |
| Resume parse success rate | ≥ 90% of valid PDFs |
| Users who view recommendations | ≥ 80% of submissions |
| Session completion rate (submit → results) | ≥ 75% |

### Pilot Outcome (8-week)
| Metric | Target |
|--------|--------|
| Student submissions during pilot | ≥ 200 |
| Users who act on ≥ 1 recommendation (self-reported) | ≥ 30% |

---

## 8. Assumptions & Dependencies

- Dataset of 200–500 labelled student records (placed / not placed) available for training.
- Self-reported contest ratings are accepted as-is (no verification in V1).
- Model is retrained offline; no online learning in V1.
- Sentence-BERT inference runs on CPU within the 20s SLA for MVP load (< 50 concurrent users).
- Users upload standard text-based PDF resumes (not scanned images).

---

## 9. Placement Matrix Score Reference

**Source:** Ramdeobaba University (RBU) — Career Development & Placement Cell  
**Document:** *Metrics for Performance Evaluation for Campus Placement 2026 (IT Industry)*  
**Total:** 100 marks across 8 categories

| Category | Max Marks | Key Scoring Signals |
|----------|-----------|--------------------|
| **10th Percentage** | 5 | >80%=5, 75–79%=4, 70–74%=3, 65–69%=2, <65%=1 |
| **12th Percentage** | 5 | Same scale as 10th |
| **CGPA** | 5 | >8=5, 7.5–7.9=4, 7.0–7.4=3, 6.5–6.9=2, <6.5=1 |
| **GitHub Profile** | 15 | Contributions(5) + Collaborations(6, 2pts each) + Monthly frequency(4) |
| **Coding Platform** | 20 | HackerRank/HackerEarth badges(5) + Med/Hard questions(5) + LeetCode submissions(10) |
| **Internship Experience** | 10 | International(10), IT company(5/each), EduSkills(4/each, max 2); +5 if stipend ≥ ₹10k |
| **Skillset & Certifications** | 15 | Global cert/AWS/GCP/Azure(5/each), NPTEL(4/each, max 2), RBU online(3/each, max 2) |
| **Projects** | 15 | Industry/SIH/GOI(5/each), Domain-specific outside curriculum(4/each) |
| **Hackathons & Competitions** | 10 | 1st(5), 2nd(4), 3rd/Consolation(3), Participation(2) per event |
| **TOTAL** | **100** | |

> The app computes this score deterministically from form inputs and displays a category-wise breakdown alongside the ML placement probability.

---

## 10. Open Questions (to resolve before build)

1. What is the exact dataset source? Internal college records, public datasets, or synthetic?
2. Is the 20s SLA measured from click → full page render, or click → model response?
3. Should the re-analysis (what-if) feature re-run the model server-side, or be a local approximation?
4. Which contest handles are mandatory vs optional in the form?
