import { baseApi } from './baseApi';

import type { DashboardData } from '@/types';

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    dashboard: build.query<DashboardData, void>({
      query: () => '/dashboard',
      providesTags: ['Dashboard'],
    }),
  }),
});

export const { useDashboardQuery } = dashboardApi;
