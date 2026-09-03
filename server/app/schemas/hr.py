from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, Field

from app.models.hr import AttendanceStatus, LeaveType, LeaveStatus, PayrollStatus, PerformanceStatus


# ============================================================================
# Attendance Schemas
# ============================================================================

class AttendanceCreate(BaseModel):
    user_id: int
    attendance_date: date
    check_in_time: datetime | None = None
    check_out_time: datetime | None = None
    hours_worked: float | None = None
    status: AttendanceStatus
    notes: str | None = Field(default=None, max_length=500)


class AttendanceUpdate(BaseModel):
    attendance_date: date | None = None
    check_in_time: datetime | None = None
    check_out_time: datetime | None = None
    hours_worked: float | None = None
    status: AttendanceStatus | None = None
    notes: str | None = Field(default=None, max_length=500)


class AttendanceOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    attendance_date: date
    check_in_time: datetime | None
    check_out_time: datetime | None
    hours_worked: float | None
    status: AttendanceStatus
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ============================================================================
# Leave Request Schemas
# ============================================================================

class LeaveRequestCreate(BaseModel):
    user_id: int
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str = Field(min_length=5, max_length=500)


class LeaveRequestUpdate(BaseModel):
    leave_type: LeaveType | None = None
    start_date: date | None = None
    end_date: date | None = None
    reason: str | None = Field(default=None, min_length=5, max_length=500)
    status: LeaveStatus | None = None


class LeaveRequestApprove(BaseModel):
    approved_by_id: int


class LeaveRequestReject(BaseModel):
    rejection_reason: str = Field(min_length=5, max_length=500)


class LeaveRequestOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str
    status: LeaveStatus
    approved_by_id: int | None
    approved_by_name: str | None
    approval_date: datetime | None
    rejection_reason: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ============================================================================
# Payroll Schemas
# ============================================================================

class PayrollRecordCreate(BaseModel):
    user_id: int
    payroll_month: date
    base_salary: float = Field(gt=0)
    allowances: float = Field(default=0.0, ge=0)
    deductions: float = Field(default=0.0, ge=0)
    remarks: str | None = Field(default=None, max_length=500)


class PayrollRecordUpdate(BaseModel):
    base_salary: float | None = Field(default=None, gt=0)
    allowances: float | None = Field(default=None, ge=0)
    deductions: float | None = Field(default=None, ge=0)
    status: PayrollStatus | None = None
    remarks: str | None = Field(default=None, max_length=500)


class PayrollRecordProcess(BaseModel):
    status: PayrollStatus


class PayrollRecordOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    payroll_month: date
    base_salary: float
    allowances: float
    deductions: float
    net_salary: float
    status: PayrollStatus
    remarks: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ============================================================================
# Performance Review Schemas
# ============================================================================

class PerformanceReviewCreate(BaseModel):
    user_id: int
    reviewer_id: int
    review_date: date
    rating: float = Field(ge=0.0, le=5.0)
    comments: str | None = Field(default=None, max_length=2000)


class PerformanceReviewUpdate(BaseModel):
    review_date: date | None = None
    rating: float | None = Field(default=None, ge=0.0, le=5.0)
    comments: str | None = Field(default=None, max_length=2000)
    status: PerformanceStatus | None = None


class PerformanceReviewOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    reviewer_id: int
    reviewer_name: str
    review_date: date
    rating: float
    comments: str | None
    status: PerformanceStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ============================================================================
# Summary/Statistics Schemas
# ============================================================================

class EmployeeAttendanceSummary(BaseModel):
    """Monthly attendance summary for an employee"""
    user_id: int
    user_name: str
    month: date
    total_days: int
    present_days: int
    absent_days: int
    late_days: int
    leave_days: int
    attendance_percentage: float

    model_config = {"from_attributes": True}


class DepartmentAttendanceReport(BaseModel):
    """Department-wide attendance summary"""
    department_id: int
    department_name: str
    total_employees: int
    present_today: int
    absent_today: int
    on_leave_today: int
    attendance_percentage: float

    model_config = {"from_attributes": True}
