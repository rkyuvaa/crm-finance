import { baseApi } from './baseApi';

export interface Attendance {
  id: number;
  user_id: number;
  user_name: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  hours_worked: number | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'HALF_DAY';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: number;
  user_id: number;
  user_name: string;
  leave_type: 'SICK' | 'CASUAL' | 'EARNED' | 'UNPAID' | 'MATERNITY' | 'PATERNITY';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approved_by_id: number | null;
  approved_by_name: string | null;
  approval_date: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollRecord {
  id: number;
  user_id: number;
  user_name: string;
  payroll_month: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  status: 'DRAFT' | 'PROCESSED' | 'PAID' | 'FAILED';
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface PerformanceReview {
  id: number;
  user_id: number;
  user_name: string;
  reviewer_id: number;
  reviewer_name: string;
  review_date: string;
  rating: number;
  comments: string | null;
  status: 'PENDING' | 'COMPLETED' | 'ARCHIVED';
  created_at: string;
  updated_at: string;
}

export interface AttendanceCreate {
  user_id: number;
  attendance_date: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  hours_worked?: number | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'HALF_DAY';
  notes?: string | null;
}

export interface LeaveRequestCreate {
  user_id: number;
  leave_type: 'SICK' | 'CASUAL' | 'EARNED' | 'UNPAID' | 'MATERNITY' | 'PATERNITY';
  start_date: string;
  end_date: string;
  reason: string;
}

export interface PayrollRecordCreate {
  user_id: number;
  payroll_month: string;
  base_salary: number;
  allowances?: number;
  deductions?: number;
  remarks?: string | null;
}

export interface PerformanceReviewCreate {
  user_id: number;
  reviewer_id: number;
  review_date: string;
  rating: number;
  comments?: string | null;
}

export const hrApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Attendance endpoints
    listAttendance: build.query<
      Attendance[],
      { user_id?: number; start_date?: string; end_date?: string; status?: string } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params) {
          if (params.user_id) searchParams.append('user_id', String(params.user_id));
          if (params.start_date) searchParams.append('start_date', params.start_date);
          if (params.end_date) searchParams.append('end_date', params.end_date);
          if (params.status) searchParams.append('status_filter', params.status);
        }
        return { url: `/hr/attendance?${searchParams.toString()}` };
      },
      providesTags: ['Attendance'],
    }),
    getAttendance: build.query<Attendance, number>({
      query: (id) => ({ url: `/hr/attendance/${id}` }),
      providesTags: ['Attendance'],
    }),
    createAttendance: build.mutation<Attendance, AttendanceCreate>({
      query: (body) => ({ url: '/hr/attendance', method: 'POST', body }),
      invalidatesTags: ['Attendance'],
    }),
    updateAttendance: build.mutation<Attendance, { id: number; body: Partial<AttendanceCreate> }>({
      query: ({ id, body }) => ({ url: `/hr/attendance/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Attendance'],
    }),
    deleteAttendance: build.mutation<void, number>({
      query: (id) => ({ url: `/hr/attendance/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Attendance'],
    }),

    // Leave request endpoints
    listLeaveRequests: build.query<
      LeaveRequest[],
      { user_id?: number; status?: string } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params) {
          if (params.user_id) searchParams.append('user_id', String(params.user_id));
          if (params.status) searchParams.append('status_filter', params.status);
        }
        return { url: `/hr/leave-requests?${searchParams.toString()}` };
      },
      providesTags: ['LeaveRequests'],
    }),
    createLeaveRequest: build.mutation<LeaveRequest, LeaveRequestCreate>({
      query: (body) => ({ url: '/hr/leave-requests', method: 'POST', body }),
      invalidatesTags: ['LeaveRequests'],
    }),
    approveLeaveRequest: build.mutation<LeaveRequest, { id: number; approved_by_id: number }>({
      query: ({ id, approved_by_id }) => ({
        url: `/hr/leave-requests/${id}/approve`,
        method: 'POST',
        body: { approved_by_id },
      }),
      invalidatesTags: ['LeaveRequests'],
    }),
    rejectLeaveRequest: build.mutation<LeaveRequest, { id: number; rejection_reason: string }>({
      query: ({ id, rejection_reason }) => ({
        url: `/hr/leave-requests/${id}/reject`,
        method: 'POST',
        body: { rejection_reason },
      }),
      invalidatesTags: ['LeaveRequests'],
    }),

    // Payroll endpoints
    listPayroll: build.query<
      PayrollRecord[],
      { user_id?: number; status?: string; start_month?: string; end_month?: string } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params) {
          if (params.user_id) searchParams.append('user_id', String(params.user_id));
          if (params.status) searchParams.append('status_filter', params.status);
          if (params.start_month) searchParams.append('start_month', params.start_month);
          if (params.end_month) searchParams.append('end_month', params.end_month);
        }
        return { url: `/hr/payroll?${searchParams.toString()}` };
      },
      providesTags: ['Payroll'],
    }),
    createPayrollRecord: build.mutation<PayrollRecord, PayrollRecordCreate>({
      query: (body) => ({ url: '/hr/payroll', method: 'POST', body }),
      invalidatesTags: ['Payroll'],
    }),
    updatePayrollRecord: build.mutation<
      PayrollRecord,
      { id: number; body: Partial<PayrollRecordCreate & { status: string }> }
    >({
      query: ({ id, body }) => ({ url: `/hr/payroll/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Payroll'],
    }),

    // Performance review endpoints
    listPerformanceReviews: build.query<
      PerformanceReview[],
      { user_id?: number; reviewer_id?: number } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params) {
          if (params.user_id) searchParams.append('user_id', String(params.user_id));
          if (params.reviewer_id) searchParams.append('reviewer_id', String(params.reviewer_id));
        }
        return { url: `/hr/performance-reviews?${searchParams.toString()}` };
      },
      providesTags: ['PerformanceReviews'],
    }),
    getPerformanceReview: build.query<PerformanceReview, number>({
      query: (id) => ({ url: `/hr/performance-reviews/${id}` }),
      providesTags: ['PerformanceReviews'],
    }),
    createPerformanceReview: build.mutation<PerformanceReview, PerformanceReviewCreate>({
      query: (body) => ({ url: '/hr/performance-reviews', method: 'POST', body }),
      invalidatesTags: ['PerformanceReviews'],
    }),
  }),
});

export const {
  useListAttendanceQuery,
  useGetAttendanceQuery,
  useCreateAttendanceMutation,
  useUpdateAttendanceMutation,
  useDeleteAttendanceMutation,
  useListLeaveRequestsQuery,
  useCreateLeaveRequestMutation,
  useApproveLeaveRequestMutation,
  useRejectLeaveRequestMutation,
  useListPayrollQuery,
  useCreatePayrollRecordMutation,
  useUpdatePayrollRecordMutation,
  useListPerformanceReviewsQuery,
  useGetPerformanceReviewQuery,
  useCreatePerformanceReviewMutation,
} = hrApi;
