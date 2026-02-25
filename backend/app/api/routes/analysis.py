import json
from fastapi import APIRouter, Depends, Form, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.models import User, StudentProfile, Submission
from app.schemas.profile import ProfileSubmissionRequest, AnalysisResponse
from app.engine.scorer import MatrixScorer
from app.api.deps import get_db, get_current_user
from typing import Annotated

router = APIRouter()

@router.post("/", response_model=AnalysisResponse)
async def analyse_profile(
    background_tasks: BackgroundTasks,
    formData: Annotated[str, Form(...)],
    resumeFile: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits a profile + resume for full analysis. 
    Accepts Multipart form data (stringified JSON + PDF).
    """
    # 1. Parse incoming stringified JSON into Pydantic model
    raw_data = json.loads(formData)
    request_data = ProfileSubmissionRequest(**raw_data)

    # 2. Extract deterministic Score & Breakdown
    matrix_score, matrix_breakdown = MatrixScorer.calculate_score(request_data)

    # 3. Resume Extraction via PyPDF2
    pdf_bytes = await resumeFile.read()
    from app.engine.parser import ResumeParser
    resume_text = ResumeParser.extract_text(pdf_bytes)
    ats_score, keyword_gaps = ResumeParser.calculate_ats_score(resume_text)

    # 4. ML Prediction Execution
    from app.engine.ml import predictor
    probability, confidence_lower, confidence_upper, shap_contributions, actions = predictor.predict(
        profile=request_data,
        matrix_score=matrix_score,
        ats_score=ats_score
    )

    # 5. Persist to DB
    profile = StudentProfile(
        user_id=str(current_user.id),
        **request_data.academic.model_dump(),
        **request_data.coding.model_dump(),
        **request_data.experience.model_dump()
    )
    db.add(profile)
    db.flush() # Get profile ID

    submission = Submission(
        user_id=str(current_user.id),
        profile_id=profile.id,
        ats_score=ats_score,
        keyword_gaps=keyword_gaps,
        probability=probability,
        confidence_lower=confidence_lower,
        confidence_upper=confidence_upper,
        matrix_score=matrix_score,
        matrix_breakdown=matrix_breakdown.model_dump(),
        shap_contributions=shap_contributions,
        actions=actions
    )
    db.add(submission)
    db.commit()

    return AnalysisResponse(
        probability=probability,
        confidenceLower=confidence_lower,
        confidenceUpper=confidence_upper,
        matrixScore=matrix_score,
        matrixBreakdown=matrix_breakdown,
        atsScore=ats_score,
        atsKeywordGaps=keyword_gaps,
        shapContributions=shap_contributions,
        actions=actions
    )
