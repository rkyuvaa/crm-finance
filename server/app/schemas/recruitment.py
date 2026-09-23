from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, EmailStr


# ============================================================================
# Job Requisition Schemas
# ============================================================================

class JobRequisitionBase(BaseModel):
    job_title: str = Field(..., min_length=2, max_length=150)
    department: str = Field(..., min_length=2, max_length=100)
    vacancies: int = Field(1, ge=1)
    employment_type: str = Field("Full Time", max_length=50)
    required_qualification: str = Field(..., max_length=200)
    required_experience: str = Field(..., max_length=100)
    skills: str = Field(..., max_length=500)
    salary_range: str = Field(..., max_length=100)
    preferred_joining_date: Optional[date] = None
    job_description: str = Field(..., min_length=5)
    requesting_department: str = Field(..., max_length=100)


class JobRequisitionCreate(JobRequisitionBase):
    pass


class JobRequisitionUpdate(BaseModel):
    job_title: Optional[str] = None
    department: Optional[str] = None
    vacancies: Optional[int] = None
    employment_type: Optional[str] = None
    required_qualification: Optional[str] = None
    required_experience: Optional[str] = None
    skills: Optional[str] = None
    salary_range: Optional[str] = None
    preferred_joining_date: Optional[date] = None
    job_description: Optional[str] = None
    requesting_department: Optional[str] = None


class JobRequisitionApproveReject(BaseModel):
    action: str = Field(..., pattern="^(Approve|Reject)$")
    rejection_reason: Optional[str] = None


class JobRequisitionOut(JobRequisitionBase):
    id: int
    req_code: str
    requester_id: Optional[int] = None
    requester_name: str
    status: str
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    candidate_count: int = 0

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Candidate Schemas
# ============================================================================

class CandidateBase(BaseModel):
    job_requisition_id: Optional[int] = None
    name: str = Field(..., min_length=2, max_length=120)
    mobile: str = Field(..., min_length=5, max_length=20)
    email: EmailStr
    resume_url: Optional[str] = None
    experience: str = Field(..., max_length=100)
    qualification: str = Field(..., max_length=200)
    current_company: Optional[str] = None
    current_salary: Optional[str] = None
    expected_salary: Optional[str] = None
    notice_period: Optional[str] = None
    candidate_source: str = Field("Direct", max_length=100)


class CandidateCreate(CandidateBase):
    stage: Optional[str] = "Sourcing"


class CandidateUpdate(BaseModel):
    job_requisition_id: Optional[int] = None
    name: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[EmailStr] = None
    resume_url: Optional[str] = None
    experience: Optional[str] = None
    qualification: Optional[str] = None
    current_company: Optional[str] = None
    current_salary: Optional[str] = None
    expected_salary: Optional[str] = None
    notice_period: Optional[str] = None
    candidate_source: Optional[str] = None


class CandidateStageTransition(BaseModel):
    new_stage: str
    remarks: Optional[str] = None
    rejection_reason: Optional[str] = None
    on_hold_reason: Optional[str] = None

    # Interview info if transitioning to/in Interview stage
    interview_type: Optional[str] = None
    interview_date: Optional[datetime] = None
    interviewer_panel: Optional[str] = None
    interview_round: Optional[str] = None
    interview_feedback: Optional[str] = None
    interview_rating: Optional[float] = None

    # Selected info if transitioning to Selected
    selected_designation: Optional[str] = None
    selected_department: Optional[str] = None
    proposed_salary: Optional[str] = None
    expected_joining_date: Optional[date] = None
    selected_employment_type: Optional[str] = None

    # Offer info if transitioning in Offer & Joining
    offer_status: Optional[str] = None
    confirmed_joining_date: Optional[date] = None


class CandidateInterviewSchedule(BaseModel):
    interview_type: str = Field(..., max_length=100)
    interview_date: datetime
    interviewer_panel: str = Field(..., max_length=255)
    interview_round: str = Field(..., max_length=100)
    interview_feedback: Optional[str] = None
    interview_rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    interview_remarks: Optional[str] = None


class CandidateOfferUpdate(BaseModel):
    offer_status: str = Field(..., pattern="^(Offer Draft|Offer Released|Offer Accepted|Offer Declined)$")
    confirmed_joining_date: Optional[date] = None
    rejection_reason: Optional[str] = None


class CandidateCreateEmployee(BaseModel):
    emp_id: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    branch: Optional[str] = "Main Office"
    salary: Optional[float] = None
    password: Optional[str] = "Employee@123"


class CandidateStageHistoryOut(BaseModel):
    id: int
    candidate_id: int
    previous_stage: Optional[str] = None
    new_stage: str
    changed_by_id: Optional[int] = None
    changed_by_name: str
    changed_at: datetime
    remarks: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CandidateDocumentOut(BaseModel):
    id: int
    candidate_id: int
    file_name: str
    file_path: str
    file_type: Optional[str] = None
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CandidateOut(CandidateBase):
    id: int
    candidate_code: str
    stage: str
    previous_stage: Optional[str] = None
    on_hold_reason: Optional[str] = None
    rejection_reason: Optional[str] = None

    interview_type: Optional[str] = None
    interview_date: Optional[datetime] = None
    interviewer_panel: Optional[str] = None
    interview_round: Optional[str] = None
    interview_feedback: Optional[str] = None
    interview_rating: Optional[float] = None
    interview_remarks: Optional[str] = None

    selected_designation: Optional[str] = None
    selected_department: Optional[str] = None
    proposed_salary: Optional[str] = None
    expected_joining_date: Optional[date] = None
    selected_employment_type: Optional[str] = None

    offer_status: Optional[str] = None
    confirmed_joining_date: Optional[date] = None

    is_employee_created: bool
    created_employee_id: Optional[int] = None
    joined_date: Optional[date] = None

    job_title: Optional[str] = None
    job_department: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    stage_history: List[CandidateStageHistoryOut] = []
    documents: List[CandidateDocumentOut] = []

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Dashboard & KPI Schemas
# ============================================================================

class RecruitmentDashboardKPIs(BaseModel):
    open_requisitions: int = 0
    total_candidates: int = 0
    job_requisition: int = 0
    approval: int = 0
    sourcing: int = 0
    screening: int = 0
    interviews: int = 0
    selected: int = 0
    offers: int = 0
    joining_pending: int = 0
    joined: int = 0
    on_hold: int = 0
    rejected: int = 0
