from datetime import datetime, date
from typing import TYPE_CHECKING
import enum

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func, Date, Float, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class RecruitmentStage(enum.StrEnum):
    JOB_REQUISITION = "Job Requisition"
    APPROVAL = "Approval"
    SOURCING = "Sourcing"
    SCREENING = "Screening"
    INTERVIEW = "Interview"
    SELECTED = "Selected"
    OFFER_JOINING = "Offer & Joining"
    JOINED = "Joined"
    ON_HOLD = "On Hold"
    REJECTED = "Rejected"


class RequisitionStatus(enum.StrEnum):
    JOB_REQUISITION = "Job Requisition"
    APPROVAL = "Approval"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    CLOSED = "Closed"


class OfferStatus(enum.StrEnum):
    DRAFT = "Offer Draft"
    RELEASED = "Offer Released"
    ACCEPTED = "Offer Accepted"
    DECLINED = "Offer Declined"


class JobRequisition(Base):
    """Manpower Job Requisition model"""
    __tablename__ = "hr_job_requisitions"

    id: Mapped[int] = mapped_column(primary_key=True)
    req_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    job_title: Mapped[str] = mapped_column(String(150), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    vacancies: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    employment_type: Mapped[str] = mapped_column(String(50), nullable=False, default="Full Time")
    required_qualification: Mapped[str] = mapped_column(String(200), nullable=False)
    required_experience: Mapped[str] = mapped_column(String(100), nullable=False)
    skills: Mapped[str] = mapped_column(String(500), nullable=False)
    salary_range: Mapped[str] = mapped_column(String(100), nullable=False)
    preferred_joining_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    job_description: Mapped[str] = mapped_column(Text, nullable=False)
    requesting_department: Mapped[str] = mapped_column(String(100), nullable=False)
    requester_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    requester_name: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Job Requisition", nullable=False, index=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    requester: Mapped["User | None"] = relationship("User", foreign_keys=[requester_id], lazy="joined")
    candidates: Mapped[list["Candidate"]] = relationship("Candidate", back_populates="job_requisition")


class Candidate(Base):
    """Recruitment Candidate record"""
    __tablename__ = "hr_candidates"

    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    job_requisition_id: Mapped[int | None] = mapped_column(
        ForeignKey("hr_job_requisitions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    mobile: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    resume_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    experience: Mapped[str] = mapped_column(String(100), nullable=False)
    qualification: Mapped[str] = mapped_column(String(200), nullable=False)
    current_company: Mapped[str | None] = mapped_column(String(150), nullable=True)
    current_salary: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expected_salary: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notice_period: Mapped[str | None] = mapped_column(String(50), nullable=True)
    candidate_source: Mapped[str] = mapped_column(String(100), nullable=False, default="Direct", index=True)
    
    # 10 Stages logic
    stage: Mapped[str] = mapped_column(String(50), default="Sourcing", nullable=False, index=True)
    previous_stage: Mapped[str | None] = mapped_column(String(50), nullable=True)
    on_hold_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Interview Round details
    interview_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    interview_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    interviewer_panel: Mapped[str | None] = mapped_column(String(255), nullable=True)
    interview_round: Mapped[str | None] = mapped_column(String(100), nullable=True)
    interview_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    interview_rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    interview_remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Final Selection details
    selected_designation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    selected_department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    proposed_salary: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expected_joining_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    selected_employment_type: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Offer & Joining details
    offer_status: Mapped[str | None] = mapped_column(String(50), nullable=True)  # Offer Draft, Offer Released, Offer Accepted, Offer Declined
    confirmed_joining_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)

    # Employee record linkage
    is_employee_created: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_employee_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    joined_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    job_requisition: Mapped["JobRequisition | None"] = relationship("JobRequisition", back_populates="candidates", lazy="joined")
    created_employee: Mapped["User | None"] = relationship("User", foreign_keys=[created_employee_id], lazy="joined")
    stage_history: Mapped[list["CandidateStageHistory"]] = relationship(
        "CandidateStageHistory", back_populates="candidate", cascade="all, delete-orphan", order_by="CandidateStageHistory.changed_at.desc()"
    )
    documents: Mapped[list["CandidateDocument"]] = relationship(
        "CandidateDocument", back_populates="candidate", cascade="all, delete-orphan"
    )


class CandidateStageHistory(Base):
    """Audit history of recruitment stage changes"""
    __tablename__ = "hr_candidate_stage_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("hr_candidates.id", ondelete="CASCADE"), nullable=False, index=True
    )
    previous_stage: Mapped[str | None] = mapped_column(String(50), nullable=True)
    new_stage: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    changed_by_name: Mapped[str] = mapped_column(String(120), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="stage_history")


class CandidateDocument(Base):
    """Candidate uploaded documents and resumes"""
    __tablename__ = "hr_candidate_documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("hr_candidates.id", ondelete="CASCADE"), nullable=False, index=True
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="documents")
