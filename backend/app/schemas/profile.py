from typing import Optional
from pydantic import BaseModel, Field

class AcademicDetails(BaseModel):
    cgpa: float
    cgpaScale: int
    tenthPct: float
    twelfthPct: float
    branch: str
    year: int
    backlogs: int

class CodingDetails(BaseModel):
    lcSubmissions: int
    hrBadges: int
    hrMedHardSolved: int
    githubContributions: int
    githubCollaborations: int
    githubMonthlyActive: bool

class ExperienceDetails(BaseModel):
    internshipType: str
    internshipCount: int
    internshipStipendAbove10k: bool
    projectsIndustry: int
    projectsDomain: int
    certsGlobal: int
    certsNptel: int
    certsRbu: int
    hackathonFirst: int
    hackathonSecond: int
    hackathonThird: int
    hackathonParticipation: int

class ProfileSubmissionRequest(BaseModel):
    """The incoming form payload matching React frontend state (WizardFormData)."""
    academic: AcademicDetails
    coding: CodingDetails
    experience: ExperienceDetails

class MatrixCategoryBreakdown(BaseModel):
    score: float
    maxScore: float

class MatrixBreakdown(BaseModel):
    academics: MatrixCategoryBreakdown
    internship: MatrixCategoryBreakdown
    projects: MatrixCategoryBreakdown
    coding: MatrixCategoryBreakdown
    hackathons: MatrixCategoryBreakdown
    certifications: MatrixCategoryBreakdown

class AnalysisResponse(BaseModel):
    probability: float
    confidenceLower: float
    confidenceUpper: float
    matrixScore: float
    matrixBreakdown: MatrixBreakdown
    atsScore: float
    atsKeywordGaps: list[str]
    shapContributions: list[dict] # { feature: str, value: float }
    actions: list[dict] # { text: str, category: str, priority: str }
