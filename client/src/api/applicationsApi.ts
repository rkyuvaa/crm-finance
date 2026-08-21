import { baseApi } from './baseApi';

import type {
  ActivityLogEntry,
  ApplicationItem,
  ApplicationListResponse,
  PlannedActivityInput,
  PlannedActivityItem,
} from '@/types';

export interface ApplicationFilters {
  page?: number;
  page_size?: number;
  scope?: 'all' | 'recent';
  tab?: 'all' | 'mine' | 'pending';
  q?: string;
  status?: string;
  finance_company_id?: number;
  date_from?: string;
  date_to?: string;
  stage_key?: string;
}

export interface NewApplication {
  customer_name: string;
  customer_phone: string;
  vehicle: string;
  amount: number;
  status?: string;
  vehicle_model_id?: number | null;
  vehicle_price?: number;
  down_payment?: number;
  finance_company_id?: number | null;
}

export const applicationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    applications: build.query<ApplicationListResponse, ApplicationFilters>({
      query: (filters) => ({ url: '/applications', params: filters }),
      providesTags: ['Applications'],
    }),
    createApplication: build.mutation<ApplicationItem, NewApplication>({
      query: (body) => ({ url: '/applications', method: 'POST', body }),
      invalidatesTags: ['Applications', 'Dashboard'],
    }),
    updateApplication: build.mutation<ApplicationItem, { id: number; body: Partial<NewApplication> }>({
      query: ({ id, body }) => ({ url: `/applications/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_res, _err, { id }) => ['Applications', 'Dashboard', { type: 'Applications', id }],
    }),
    deleteApplication: build.mutation<void, number>({
      query: (id) => ({ url: `/applications/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Applications', 'Dashboard'],
    }),
    applicationActivity: build.query<ActivityLogEntry[], number>({
      query: (id) => ({ url: `/applications/${id}/activity` }),
      providesTags: (_result, _err, id) => [{ type: 'Applications', id }],
    }),
    plannedActivities: build.query<PlannedActivityItem[], number>({
      query: (appId) => ({ url: `/applications/${appId}/planned-activities` }),
      providesTags: (_res, _err, appId) => [{ type: 'PlannedActivities', id: appId }],
    }),
    createPlannedActivity: build.mutation<PlannedActivityItem, { appId: number; body: PlannedActivityInput }>({
      query: ({ appId, body }) => ({
        url: `/applications/${appId}/planned-activities`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, { appId }) => [
        { type: 'PlannedActivities', id: appId },
        { type: 'Applications', id: appId },
      ],
    }),
    updatePlannedActivity: build.mutation<
      PlannedActivityItem,
      { appId: number; actId: number; body: Partial<PlannedActivityInput & { status?: string }> }
    >({
      query: ({ appId, actId, body }) => ({
        url: `/applications/${appId}/planned-activities/${actId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_res, _err, { appId }) => [
        { type: 'PlannedActivities', id: appId },
        { type: 'Applications', id: appId },
      ],
    }),
  }),
});

export const {
  useApplicationsQuery,
  useCreateApplicationMutation,
  useUpdateApplicationMutation,
  useDeleteApplicationMutation,
  useApplicationActivityQuery,
  usePlannedActivitiesQuery,
  useCreatePlannedActivityMutation,
  useUpdatePlannedActivityMutation,
} = applicationsApi;
