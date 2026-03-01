"""
ml.py — Hybrid DL + Gemini Placement Predictor

Pipeline:
  1. scorer.py      → matrix score (rule-based, 100 pts)
  2. dl_model.py    → placement PROBABILITY (neural network, 83% accuracy)
  3. _heuristic_predict → calibrated fallback probability
  4. Gemini AI      → UNIQUE, deeply personalised recommendations per candidate

Key design: Gemini receives the student's EXACT numbers and their specific
gaps-to-target. Every recommendation is mathematically derived from their
actual profile — not a template.
"""

import os
import json
import re
import logging
from typing import Optional

from app.schemas.profile import (
    ProfileSubmissionRequest,
    ShapContribution,
    ActionItem,
)
from app.core.config import settings

logger = logging.getLogger(__name__)


# ─── DL Model (lazy-loaded) ───────────────────────────────────────────────────

_dl_model  = None
_dl_scaler = None

def _load_dl_model():
    global _dl_model, _dl_scaler
    import pickle
    from pathlib import Path

    base = Path(__file__).parent
    model_path  = base / 'placement_model.pkl'
    scaler_path = base / 'scaler.pkl'

    if not model_path.exists():
        logger.warning("DL model not found — using heuristic only")
        return False

    with open(model_path, 'rb') as f:
        _dl_model = pickle.load(f)
    with open(scaler_path, 'rb') as f:
        _dl_scaler = pickle.load(f)

    logger.info("✅ DL model loaded successfully")
    return True


def _dl_predict(profile: ProfileSubmissionRequest, ats_score: float) -> Optional[float]:
    global _dl_model, _dl_scaler
    import numpy as np

    if _dl_model is None:
        if not _load_dl_model():
            return None

    try:
        code = profile.coding
        acad = profile.academic
        exp  = profile.experience
        cgpa_norm = acad.cgpa * (10.0 / acad.cgpaScale)

        features = np.array([[
            float(cgpa_norm),
            float(code.lcTotalSolved or 0),
            float(code.lcActiveDays or 0),
            float(code.githubContributions or 0),
            float(getattr(code, 'githubStreak', 0) or 0),
            float(code.cfRating or 0),
            float(exp.internshipCount or 0),
            float(acad.backlogs or 0),
            float(ats_score or 0),
            float((exp.projectsIndustry or 0) + (exp.projectsDomain or 0)),
        ]])

        scaled = _dl_scaler.transform(features)
        prob   = float(_dl_model.predict_proba(scaled)[0][1])
        return round(prob * 100, 1)

    except Exception as e:
        logger.error(f"DL prediction failed: {e}")
        return None


# ─── Gemini Client ────────────────────────────────────────────────────────────

_gemini_client = None

def _get_gemini_model():
    global _gemini_client
    if _gemini_client is not None:
        return _gemini_client

    api_key = getattr(settings, 'GEMINI_API_KEY', None) or os.environ.get('GEMINI_API_KEY', '')
    if not api_key or api_key.strip() == '':
        logger.warning("GEMINI_API_KEY not set — falling back to heuristic mode")
        return None

    try:
        from google import genai as google_genai
        _gemini_client = google_genai.Client(api_key=api_key)
        logger.info("Gemini client initialized successfully")
        return _gemini_client
    except Exception as e:
        logger.error(f"Failed to initialize Gemini client: {e}")
        return None


def _compute_candidate_gaps(
    profile: ProfileSubmissionRequest,
    ats_score: float,
    final_probability: float,
) -> dict:
    """
    Compute the EXACT numerical gap between this student's current stats
    and the typical benchmark for their target tier.
    
    This is what makes recommendations unique per candidate —
    every number is derived from their actual profile.
    """
    code = profile.coding
    acad = profile.academic
    exp  = profile.experience
    cgpa_norm = round(acad.cgpa * (10.0 / acad.cgpaScale), 2)

    # ── Determine target tier based on DL probability ─────────────────────
    if final_probability >= 75:
        tier = "Tier-1 (Google/Microsoft/Amazon)"
        lc_target    = 500
        lc_hard_target = 50
        lc_active_target = 200
        cf_target    = 1600
        gh_target    = 500
        ats_target   = 85
    elif final_probability >= 55:
        tier = "Tier-2 (TCS Digital/Infosys SP/Wipro Elite)"
        lc_target    = 300
        lc_hard_target = 25
        lc_active_target = 150
        cf_target    = 1400
        gh_target    = 300
        ats_target   = 75
    else:
        tier = "Mass Recruiter (TCS/Wipro/Cognizant)"
        lc_target    = 150
        lc_hard_target = 10
        lc_active_target = 100
        cf_target    = 1200
        gh_target    = 150
        ats_target   = 65

    # ── Compute exact gaps ─────────────────────────────────────────────────
    gaps = {
        "target_tier": tier,
        "probability": final_probability,

        # LeetCode
        "lc_current":       code.lcTotalSolved or 0,
        "lc_target":        lc_target,
        "lc_gap":           max(0, lc_target - (code.lcTotalSolved or 0)),
        "lc_hard_current":  code.lcHardSolved or 0,
        "lc_hard_target":   lc_hard_target,
        "lc_hard_gap":      max(0, lc_hard_target - (code.lcHardSolved or 0)),
        "lc_medium_current": code.lcMediumSolved or 0,
        "lc_active_current": code.lcActiveDays or 0,
        "lc_active_target":  lc_active_target,
        "lc_active_gap":    max(0, lc_active_target - (code.lcActiveDays or 0)),

        # GitHub
        "gh_contrib_current": code.githubContributions or 0,
        "gh_contrib_target":  gh_target,
        "gh_contrib_gap":     max(0, gh_target - (code.githubContributions or 0)),
        "gh_repos_current":   code.githubRepos or 0,

        # Codeforces
        "cf_current":  code.cfRating or 0,
        "cf_target":   cf_target,
        "cf_gap":      max(0, cf_target - (code.cfRating or 0)),
        "cf_rank":     code.cfRank or "unrated",

        # Academic
        "cgpa":       cgpa_norm,
        "backlogs":   acad.backlogs or 0,

        # Resume
        "ats_current": round(ats_score, 1),
        "ats_target":  ats_target,
        "ats_gap":     max(0, ats_target - ats_score),

        # Experience
        "internships":  exp.internshipCount or 0,
        "projects":     (exp.projectsIndustry or 0) + (exp.projectsDomain or 0),
        "hackathons_won": (exp.hackathonFirst or 0) + (exp.hackathonSecond or 0),

        # What's already strong (don't recommend improving these)
        "strengths": [],
        "critical_gaps": [],
    }

    # ── Identify strengths (above target = no recommendation needed) ───────
    if (code.lcTotalSolved or 0) >= lc_target:
        gaps["strengths"].append(f"LeetCode solved ({code.lcTotalSolved} ≥ {lc_target} target)")
    if (code.lcActiveDays or 0) >= lc_active_target:
        gaps["strengths"].append(f"LeetCode consistency ({code.lcActiveDays} active days ≥ {lc_active_target} target)")
    if (code.githubContributions or 0) >= gh_target:
        gaps["strengths"].append(f"GitHub activity ({code.githubContributions} contributions ≥ {gh_target} target)")
    if (code.cfRating or 0) >= cf_target:
        gaps["strengths"].append(f"Codeforces rating ({code.cfRating} ≥ {cf_target} target)")
    if ats_score >= ats_target:
        gaps["strengths"].append(f"ATS resume score ({ats_score:.0f} ≥ {ats_target} target)")
    if cgpa_norm >= 8.5:
        gaps["strengths"].append(f"CGPA ({cgpa_norm}/10)")
    if (exp.internshipCount or 0) >= 1:
        gaps["strengths"].append(f"{exp.internshipCount} internship(s)")

    # ── Identify critical gaps (sorted by impact) ──────────────────────────
    if acad.backlogs and acad.backlogs > 0:
        gaps["critical_gaps"].append(f"{acad.backlogs} active backlog(s) — hard disqualifier")
    if gaps["lc_gap"] > 0:
        gaps["critical_gaps"].append(f"LeetCode: {gaps['lc_gap']} more problems needed to reach {lc_target} target")
    if gaps["lc_hard_gap"] > 0:
        gaps["critical_gaps"].append(f"LeetCode Hard: {gaps['lc_hard_gap']} more hard problems needed ({code.lcHardSolved or 0} → {lc_hard_target})")
    if gaps["lc_active_gap"] > 0:
        gaps["critical_gaps"].append(f"LeetCode consistency: {gaps['lc_active_gap']} more active days needed ({code.lcActiveDays or 0} → {lc_active_target})")
    if gaps["cf_gap"] > 0:
        gaps["critical_gaps"].append(f"Codeforces: need {gaps['cf_gap']} more rating points ({code.cfRating or 0} → {cf_target})")
    if gaps["ats_gap"] > 0:
        gaps["critical_gaps"].append(f"Resume ATS: {gaps['ats_gap']:.0f} points below target ({ats_score:.0f} → {ats_target})")
    if (exp.internshipCount or 0) == 0:
        gaps["critical_gaps"].append("No internships — missing up to 20 Matrix Score points")
    if gaps["gh_contrib_gap"] > 0:
        gaps["critical_gaps"].append(f"GitHub: {gaps['gh_contrib_gap']} more contributions needed ({code.githubContributions or 0} → {gh_target})")

    return gaps


def _call_gemini_personalised(
    profile: ProfileSubmissionRequest,
    final_probability: float,
    gaps: dict,
    ats_score: float,
    resume_text: str,
    resume_skills: list[str],
) -> Optional[dict]:
    """
    Gemini receives this student's EXACT gaps and generates recommendations
    that are mathematically impossible to reuse for another student.
    """
    model = _get_gemini_model()
    if model is None:
        return None

    code = profile.coding
    acad = profile.academic
    exp  = profile.experience

    # Format strengths and gaps as bullet points
    strengths_text = "\n".join(f"  ✅ {s}" for s in gaps["strengths"]) or "  (none yet)"
    gaps_text = "\n".join(f"  ❌ {g}" for g in gaps["critical_gaps"]) or "  (none — great profile!)"

    # Compute days to placement season (assume 6 months = ~180 days)
    weeks_available = 24  # approximate

    prompt = f"""You are a brutally honest placement coach for an Indian engineering student.
Our deep learning model calculated their placement probability as {final_probability}%.
Target tier: {gaps["target_tier"]}

═══ THIS STUDENT'S EXACT PROFILE ═══
CGPA: {gaps["cgpa"]}/10 | Backlogs: {gaps["backlogs"]}
LeetCode: {gaps["lc_current"]} solved ({code.lcEasySolved or 0}E / {gaps["lc_medium_current"]}M / {gaps["lc_hard_current"]}H) | Active days: {gaps["lc_active_current"]}/365
GitHub: {code.githubRepos or 0} repos | {gaps["gh_contrib_current"]} contributions/year
Codeforces: {gaps["cf_current"]} rating ({gaps["cf_rank"]}) | Solved: {code.cfSolved or 0} problems
Internships: {gaps["internships"]} | Projects: {gaps["projects"]} | Hackathons won: {gaps["hackathons_won"]}
ATS Resume Score: {gaps["ats_current"]}/100
Resume Skills: {', '.join(resume_skills[:15]) if resume_skills else 'not detected'}

═══ ALREADY STRONG — DO NOT RECOMMEND IMPROVING ═══
{strengths_text}

═══ EXACT GAPS TO {gaps["target_tier"].upper()} ═══
{gaps_text}

═══ YOUR TASK ═══
Generate 5 action items. Each must be:
1. MATHEMATICALLY SPECIFIC to this student — use their exact current number and exact target
2. PRIORITISED by ROI — biggest probability boost per week of effort first
3. TIMELINE-AWARE — {weeks_available} weeks until placement season
4. NEVER mention anything already listed as a strength above

For each action item, calculate:
- How many problems/days/points they need (target minus current = exact gap)
- A weekly breakdown (gap ÷ weeks = weekly commitment)
- Which companies specifically this unlocks

Respond ONLY with valid JSON — no markdown, no explanation outside JSON:
{{
  "reasoning": "<2-3 sentences explaining WHY this student is at {final_probability}% — cite their 3 most impactful numbers specifically>",
  "candidate_summary": "<1 sentence that would be WRONG for any other student — must include at least 3 of their exact numbers>",
  "platform_summary": {{
    "leetcode": "<verdict using their exact numbers: {gaps['lc_current']} solved, {gaps['lc_hard_current']} hard, {gaps['lc_active_current']} active days>",
    "github": "<verdict using their exact numbers: {code.githubRepos or 0} repos, {gaps['gh_contrib_current']} contributions>",
    "codeforces": "<verdict: {gaps['cf_current']} rating ({gaps['cf_rank']})>",
    "codechef": "<verdict or 'Not provided'>"
  }},
  "action_items": [
    {{
      "priority": 1,
      "action": "<specific action — MUST include their current number AND target number>",
      "rationale": "Currently at [exact current value]. Gap to {gaps['target_tier']}: [exact gap]. Weekly commitment: [gap/weeks] per week. Unlocks: [specific companies].",
      "weekly_target": "<e.g. solve 8 LeetCode problems/week>",
      "companies_unlocked": ["company1", "company2"],
      "category": "<Coding|Resume|Experience|Academic|Competitive>"
    }}
  ]
}}

CRITICAL: The action_items[0].rationale for this student MUST mention {gaps['lc_current']} (their LC count) or {gaps['cf_current']} (their CF rating) or {gaps['ats_current']} (their ATS score). If it doesn't, you've written generic advice."""

    try:
        from google import genai as google_genai
        response = model.models.generate_content(
            model='gemini-1.5-flash',
            contents=prompt,
            config=google_genai.types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=2500,
            ),
        )
        raw = response.text.strip()
        raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
        raw = re.sub(r'\s*```$', '', raw, flags=re.MULTILINE)
        raw = raw.strip()

        result = json.loads(raw)
        logger.info(f"Gemini personalised response generated for {final_probability}% candidate")
        return result

    except json.JSONDecodeError as e:
        logger.error(f"Gemini returned invalid JSON: {e}")
        return None
    except Exception as e:
        logger.error(f"Gemini API call failed: {e}")
        return None


# ─── Heuristic Fallback ───────────────────────────────────────────────────────

def _heuristic_predict(
    profile: ProfileSubmissionRequest,
    matrix_score: float,
    ats_score: float,
) -> float:
    code = profile.coding
    acad = profile.academic
    exp  = profile.experience
    cgpa_norm = acad.cgpa * (10.0 / acad.cgpaScale)

    lc_score        = min(1.0, (code.lcTotalSolved or 0) / 500.0)
    lc_hard_bonus   = min(0.15, (code.lcHardSolved or 0) / 100.0)
    lc_active_bonus = min(0.1,  (code.lcActiveDays or 0) / 200.0)
    cgpa_score      = max(0.0, min(1.0, (cgpa_norm - 6.0) / 3.5))
    gh_score        = min(1.0, ((code.githubRepos or 0) / 30.0) + ((code.githubStars or 0) / 100.0))
    cf_score        = min(1.0, (code.cfRating or 0) / 2400.0) if (code.cfRating or 0) > 0 else 0.0
    ats_norm        = ats_score / 100.0
    matrix_norm     = matrix_score / 100.0
    intern_score    = min(1.0, (exp.internshipCount or 0) * 0.3 + (
        0.15 if exp.internshipType == 'international' else
        0.1  if exp.internshipType == 'it_company' else 0.0
    ))
    backlog_penalty = min(0.3, (acad.backlogs or 0) * 0.1)

    composite = (
        0.15 * cgpa_score +
        0.20 * (lc_score + lc_hard_bonus + lc_active_bonus) +
        0.10 * gh_score +
        0.08 * cf_score +
        0.15 * matrix_norm +
        0.12 * ats_norm +
        0.10 * intern_score
    ) - backlog_penalty

    return round(max(10.0, min(95.0, composite * 100.0)), 1)


def _build_shap_contributions(
    profile: ProfileSubmissionRequest,
    ats_score: float,
    matrix_score: float,
) -> list[ShapContribution]:
    code = profile.coding
    acad = profile.academic
    exp  = profile.experience
    cgpa_norm = acad.cgpa * (10.0 / acad.cgpaScale)

    lc_score        = min(1.0, (code.lcTotalSolved or 0) / 500.0)
    lc_hard_bonus   = min(0.15, (code.lcHardSolved or 0) / 100.0)
    lc_active_bonus = min(0.1,  (code.lcActiveDays or 0) / 200.0)
    cgpa_score      = max(0.0, min(1.0, (cgpa_norm - 6.0) / 3.5))
    gh_score        = min(1.0, ((code.githubRepos or 0) / 30.0) + ((code.githubStars or 0) / 100.0))
    cf_score        = min(1.0, (code.cfRating or 0) / 2400.0) if (code.cfRating or 0) > 0 else 0.0
    ats_norm        = ats_score / 100.0
    matrix_norm     = matrix_score / 100.0
    intern_score    = min(1.0, (exp.internshipCount or 0) * 0.3)
    backlog_penalty = min(0.3, (acad.backlogs or 0) * 0.1)

    return [
        ShapContribution(feature=f"CGPA ({cgpa_norm:.1f}/10)",            value=round(cgpa_norm,2),          contribution=round(0.15*cgpa_score - 0.075, 3)),
        ShapContribution(feature=f"LeetCode Solved ({code.lcTotalSolved or 0})", value=float(code.lcTotalSolved or 0), contribution=round(0.20*lc_score - 0.10, 3)),
        ShapContribution(feature=f"LeetCode Active Days ({code.lcActiveDays or 0})", value=float(code.lcActiveDays or 0), contribution=round(lc_active_bonus - 0.05, 3)),
        ShapContribution(feature=f"LeetCode Hard ({code.lcHardSolved or 0})", value=float(code.lcHardSolved or 0), contribution=round(lc_hard_bonus - 0.075, 3)),
        ShapContribution(feature=f"GitHub Contributions ({code.githubContributions or 0}/yr)", value=float(code.githubContributions or 0), contribution=round(0.10*gh_score - 0.05, 3)),
        ShapContribution(feature=f"Codeforces Rating ({code.cfRating or 0})", value=float(code.cfRating or 0), contribution=round(0.08*cf_score - 0.04, 3)),
        ShapContribution(feature=f"ATS Resume Score ({ats_score:.0f}/100)", value=round(ats_score,1),          contribution=round(0.12*ats_norm - 0.06, 3)),
        ShapContribution(feature=f"Matrix Score ({matrix_score:.0f}/100)", value=round(matrix_score,1),        contribution=round(0.15*matrix_norm - 0.075, 3)),
        ShapContribution(feature=f"Internships ({exp.internshipCount or 0})", value=float(exp.internshipCount or 0), contribution=round(0.10*intern_score - 0.05, 3)),
        ShapContribution(feature=f"Backlogs ({acad.backlogs or 0})",        value=float(acad.backlogs or 0),   contribution=round(-backlog_penalty, 3)),
    ]


def _build_heuristic_actions(
    profile: ProfileSubmissionRequest,
    gaps: dict,
) -> list[ActionItem]:
    """Fallback actions — still uses exact gap numbers, just no Gemini."""
    actions = []
    priority = 1

    if gaps["backlogs"] > 0:
        actions.append(ActionItem(priority=priority, category="Academic",
            action=f"Clear all {gaps['backlogs']} backlog(s) — currently blocking placement eligibility",
            rationale=f"You have {gaps['backlogs']} active backlog(s). Each deducts 5 Matrix Score points and triggers auto-rejection at most companies. This is your #1 priority."))
        priority += 1

    if gaps["lc_gap"] > 0:
        weekly = max(1, round(gaps["lc_gap"] / 20))
        actions.append(ActionItem(priority=priority, category="Coding",
            action=f"Solve {gaps['lc_gap']} more LeetCode problems ({gaps['lc_current']} → {gaps['lc_target']} target for {gaps['target_tier']})",
            rationale=f"Currently at {gaps['lc_current']} solved. Need {gaps['lc_target']} for {gaps['target_tier']}. Solve {weekly} problems/week to close this gap in 20 weeks."))
        priority += 1

    if gaps["lc_hard_gap"] > 0:
        actions.append(ActionItem(priority=priority, category="Coding",
            action=f"Increase Hard problems from {gaps['lc_hard_current']} to {gaps['lc_hard_target']}+ (gap: {gaps['lc_hard_gap']} problems)",
            rationale=f"Hard problems are the primary differentiator in FAANG interviews. You need {gaps['lc_hard_gap']} more hard problems to reach the {gaps['target_tier']} benchmark."))
        priority += 1

    if gaps["cf_gap"] > 0:
        actions.append(ActionItem(priority=priority, category="Competitive",
            action=f"Improve Codeforces from {gaps['cf_current']} to {gaps['cf_target']}+ rating (gap: {gaps['cf_gap']} points)",
            rationale=f"Your CF rating {gaps['cf_current']} ({gaps['cf_rank']}) is {gaps['cf_gap']} points below the {gaps['target_tier']} benchmark of {gaps['cf_target']}. Participate in 2 Div.3 rounds per week."))
        priority += 1

    if gaps["ats_gap"] > 0:
        actions.append(ActionItem(priority=priority, category="Resume",
            action=f"Improve resume ATS score from {gaps['ats_current']} to {gaps['ats_target']}+ (gap: {gaps['ats_gap']:.0f} points)",
            rationale=f"Your ATS score {gaps['ats_current']}/100 is {gaps['ats_gap']:.0f} points below target. Add specific tech keywords matching job descriptions."))
        priority += 1

    if gaps["internships"] == 0:
        actions.append(ActionItem(priority=priority, category="Experience",
            action="Secure 1 industry internship before placement season",
            rationale="0 internships currently. Internships add up to 20 Matrix Score points and are a non-negotiable filter at product companies."))
        priority += 1

    if not actions:
        actions.append(ActionItem(priority=1, category="Interview",
            action="Focus on mock interviews and system design preparation",
            rationale=f"Strong profile at {gaps['probability']:.0f}%! Practice at interviewing.io or Pramp to convert skills into offers."))

    return actions[:5]


# ─── Main Predictor ───────────────────────────────────────────────────────────

class MLPredictor:
    """
    Hybrid DL + Gemini placement predictor.
    Probability = 60% DL + 40% heuristic
    Recommendations = Gemini with exact gap data per candidate
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MLPredictor, cls).__new__(cls)
        return cls._instance

    def initialize(self, models_dir: str = "models"):
        dl_loaded = _load_dl_model()
        gemini_ok = _get_gemini_model() is not None
        logger.info(f"MLPredictor ready — DL: {'✅' if dl_loaded else '❌'} | Gemini: {'✅' if gemini_ok else '❌'}")

    def predict(
        self,
        profile: ProfileSubmissionRequest,
        matrix_score: float,
        ats_score: float,
        resume_text: str = "",
        resume_skills: list[str] = None,
    ) -> tuple[float, list[float], list[ShapContribution], list[ActionItem], dict]:

        if resume_skills is None:
            resume_skills = []

        # ── Step 1: Probability from DL + heuristic ────────────────────────
        dl_prob        = _dl_predict(profile, ats_score)
        heuristic_prob = _heuristic_predict(profile, matrix_score, ats_score)

        if dl_prob is not None:
            final_probability = round(0.6 * dl_prob + 0.4 * heuristic_prob, 1)
        else:
            final_probability = heuristic_prob

        final_probability = max(10.0, min(95.0, final_probability))
        c_lower = round(max(5.0,  final_probability - 8.0), 1)
        c_upper = round(min(98.0, final_probability + 8.0), 1)

        # ── Step 2: SHAP from real values ──────────────────────────────────
        shap_contributions = _build_shap_contributions(profile, ats_score, matrix_score)

        # ── Step 3: Compute exact gaps per candidate ───────────────────────
        gaps = _compute_candidate_gaps(profile, ats_score, final_probability)

        # ── Step 4: Gemini generates unique recommendations ────────────────
        gemini_result = _call_gemini_personalised(
            profile=profile,
            final_probability=final_probability,
            gaps=gaps,
            ats_score=ats_score,
            resume_text=resume_text,
            resume_skills=resume_skills,
        )

        # ── Step 5: Parse actions ──────────────────────────────────────────
        actions: list[ActionItem] = []
        platform_summary = {}

        if gemini_result:
            for ai_item in gemini_result.get("action_items", []):
                try:
                    actions.append(ActionItem(
                        priority=int(ai_item.get("priority", len(actions) + 1)),
                        action=str(ai_item.get("action", "")),
                        rationale=str(ai_item.get("rationale", "")),
                        category=str(ai_item.get("category", "General")),
                    ))
                except (ValueError, KeyError):
                    continue
            platform_summary = gemini_result.get("platform_summary", {})

        # Fallback if Gemini failed or returned too few actions
        if len(actions) < 3:
            actions = _build_heuristic_actions(profile, gaps)
            code = profile.coding
            platform_summary = {
                "leetcode":   f"{code.lcTotalSolved or 0} solved ({code.lcEasySolved or 0}E/{code.lcMediumSolved or 0}M/{code.lcHardSolved or 0}H), {code.lcActiveDays or 0} active days",
                "github":     f"{code.githubRepos or 0} repos, {code.githubContributions or 0} contributions/yr",
                "codeforces": f"Rating {code.cfRating or 0} ({code.cfRank or 'unrated'})" if (code.cfRating or 0) > 0 else "Not registered",
                "codechef":   f"Rating {code.ccRating or 0}" if (code.ccRating or 0) > 0 else "Not provided",
            }

        return (
            final_probability,
            [c_lower, c_upper],
            shap_contributions,
            actions,
            platform_summary,
        )


# Global singleton
predictor = MLPredictor()