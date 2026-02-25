import os
from app.schemas.profile import ProfileSubmissionRequest
from app.core.config import settings

class MLPredictor:
    """
    Singleton wrapper holding the heavy XGBoost model and Feature Scalers in memory.
    Initializes automatically on FastAPI boot.
    """
    _instance = None
    _is_initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MLPredictor, cls).__new__(cls)
        return cls._instance

    def initialize(self, models_dir: str = "models"):
        """Load XGBoost and Scalers into memory once. Silently falls back to stub mode if not installed/found."""
        if self._is_initialized:
            return
            
        self.model_path = os.path.join(models_dir, "campus_hire_xgb.json")
        try:
            import xgboost as xgb
            self.model = xgb.Booster()
            if os.path.exists(self.model_path):
                self.model.load_model(self.model_path)
                self._model_loaded = True
            else:
                self._model_loaded = False
        except ImportError:
            # Running locally without space for heavy ML libraries
            self._model_loaded = False
            self.model = None
            
        self._is_initialized = True

    def predict(self, profile: ProfileSubmissionRequest, matrix_score: float, ats_score: float) -> tuple[float, float, float, list[dict], list[dict]]:
        """
        Runs XGBoost inference and SHAP explainability.
        Returns: (probability, conf_lower, conf_upper, shap_raw, generated_actions)
        """
        if not self._is_initialized:
            self.initialize()
            
        if self._model_loaded:
            import pandas as pd
            import xgboost as xgb
            
            # 1. Prediction mapping
            features = {
                "cgpa": profile.academic.cgpa * (10 / profile.academic.cgpaScale),
                "tenth_pct": profile.academic.tenthPct,
                "twelfth_pct": profile.academic.twelfthPct,
                "backlogs": profile.academic.backlogs,
                "lc_submissions": profile.coding.lcSubmissions,
                "hr_med_hard_solved": profile.coding.hrMedHardSolved,
                "github_commits": profile.coding.githubContributions,
                "internship_count": profile.experience.internshipCount,
                "projects_industry": profile.experience.projectsIndustry,
                "projects_domain": profile.experience.projectsDomain,
                "matrix_score_derived": matrix_score,
                "ats_score_derived": ats_score
            }
            df = pd.DataFrame([features])
            dmatrix = xgb.DMatrix(df)
            prob = float(self.model.predict(dmatrix)[0])
            
            c_low = max(0.0, prob - 0.08)
            c_high = min(1.0, prob + 0.06)
            
            import shap
            explainer = shap.TreeExplainer(self.model)
            shap_vals = explainer.shap_values(df)
            
            shap_contributions = []
            for i, col in enumerate(df.columns):
                shap_contributions.append({"feature": col, "value": float(shap_vals[0][i])})
                
        else:
            # ==== SCAFFOLDING STUB ====
            calculated = (matrix_score * 0.7) + (ats_score * 0.3)
            prob = min(calculated, 98.0) / 100.0
            c_low = max(0.0, prob - 0.1)
            c_high = min(1.0, prob + 0.08)
            
            shap_contributions = [
                {"feature": "matrix_score", "value": 0.15},
                {"feature": "cgpa", "value": 0.08 if profile.academic.cgpa > 8.0 else -0.05}
            ]
            
        actions = []
        if profile.academic.backlogs > 0:
            actions.append({"text": "Clear existing backlogs to instantly jump probability tier.", "category": "Academic", "priority": "high"})
        if matrix_score < 50:
            actions.append({"text": "Improve your core RBU Matrix metrics via external certifications.", "category": "Foundation", "priority": "medium"})
        if ats_score < 40:
            actions.append({"text": "Your resume failed keyword matches wildly. Use standard Software templates.", "category": "Resume", "priority": "high"})
            
        return (prob * 100.0, c_low * 100.0, c_high * 100.0, shap_contributions, actions)

# Global memory instance injected across API routes
predictor = MLPredictor()
