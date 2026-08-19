import { baseApi } from './baseApi';

import type { ActivityLogEntry, ApplicationItem, ApplicationListResponse } from '@/types';

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
      invalidatesTags: ['Applications', 'Dashboard'],
    }),
    deleteApplication: build.mutation<void, number>({
      query: (id) => ({ url: `/applications/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Applications', 'Dashboard'],
    }),
    applicationActivity: build.query<ActivityLogEntry[], number>({
      query: (id) => ({ url: `/applications/${id}/activity` }),
      providesTags: (_result, _err, id) => [{ type: 'Applications', id }],
    }),
  }),
});

export const {
  useApplicationsQuery,
  useCreateApplicationMutation,
  useUpdateApplicationMutation,
  useDeleteApplicationMutation,
  useApplicationActivityQuery,
} = applicationsApi;
