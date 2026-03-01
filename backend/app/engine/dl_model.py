"""
backend/app/engine/dl_model.py

Loads the trained neural network and runs predictions.
Drop this file into your backend/app/engine/ folder.

The model is loaded ONCE at startup (not on every request) for performance.
"""
import numpy as np
import pickle
import json
from pathlib import Path

BASE = Path(__file__).parent  # points to backend/app/engine/

# ── Lazy-loaded singletons ─────────────────────────────────────────
_model  = None
_scaler = None

FEATURES = [
    'cgpa',
    'leetcode_solved',
    'leetcode_streak',
    'github_contributions',
    'github_streak',
    'codeforces_rating',
    'internships',
    'backlogs',
    'ats_score',
    'projects'
]


def _load_model():
    """Load model and scaler from disk (called once)."""
    global _model, _scaler

    model_path  = BASE / 'placement_model.pkl'
    scaler_path = BASE / 'scaler.pkl'

    if not model_path.exists():
        raise FileNotFoundError(
            f"Model not found at {model_path}. "
            "Run: python generate_data.py && python train_model.py"
        )

    with open(model_path, 'rb') as f:
        _model = pickle.load(f)

    with open(scaler_path, 'rb') as f:
        _scaler = pickle.load(f)


def predict_placement(profile: dict) -> dict:
    """
    Run DL prediction on a student profile.

    Args:
        profile: dict with keys matching FEATURES list above.
                 Missing keys default to 0.

    Returns:
        {
            "placement_probability": 73.4,      # 0-100 float
            "confidence_label": "High",          # High / Medium / Low
            "placed_prediction": True,           # boolean
            "model": "neural_network"
        }

    Example:
        result = predict_placement({
            "cgpa": 8.5,
            "leetcode_solved": 250,
            "leetcode_streak": 180,
            "github_contributions": 400,
            "github_streak": 120,
            "codeforces_rating": 1200,
            "internships": 1,
            "backlogs": 0,
            "ats_score": 78.5,
            "projects": 3
        })
    """
    global _model, _scaler

    # Load on first call
    if _model is None:
        _load_model()

    # Build feature vector in correct order
    feature_vector = np.array([[
        float(profile.get('cgpa', 0)),
        float(profile.get('leetcode_solved', 0)),
        float(profile.get('leetcode_streak', 0)),
        float(profile.get('github_contributions', 0)),
        float(profile.get('github_streak', 0)),
        float(profile.get('codeforces_rating', 0)),
        float(profile.get('internships', 0)),
        float(profile.get('backlogs', 0)),
        float(profile.get('ats_score', 0)),
        float(profile.get('projects', 0)),
    ]])

    # Scale + predict
    scaled      = _scaler.transform(feature_vector)
    probability = float(_model.predict_proba(scaled)[0][1])  # P(placed=1)
    percent     = round(probability * 100, 1)
    binary_pred = bool(_model.predict(scaled)[0])

    # Confidence label
    if percent >= 75:
        label = "High"
    elif percent >= 50:
        label = "Medium"
    else:
        label = "Low"

    return {
        "placement_probability": percent,
        "confidence_label": label,
        "placed_prediction": binary_pred,
        "model": "neural_network"
    }


def is_model_loaded() -> bool:
    """Health check — returns True if model files exist."""
    return (BASE / 'placement_model.pkl').exists()