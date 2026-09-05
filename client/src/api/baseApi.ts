import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

import { Mutex } from 'async-mutex';
import { setCredentials, logout } from '@/auth/authSlice';

// Create a single mutex instance to prevent concurrent refresh calls
const mutex = new Mutex();

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api/v1',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as any)?.auth?.token || localStorage.getItem('access_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  // Wait until any active refresh has unlocked mutex before issuing request
  await mutex.waitForUnlock();
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        const refreshResult = await rawBaseQuery(
          { url: '/auth/refresh', method: 'POST' },
          api,
          extraOptions,
        );
        if (refreshResult.data) {
          const data = refreshResult.data as { access_token: string; user?: any };
          const currentUser = (api.getState() as any)?.auth?.user;
          api.dispatch(setCredentials({ token: data.access_token, user: data.user || currentUser }));
          result = await rawBaseQuery(args, api, extraOptions);
        } else {
          api.dispatch(logout());
        }
      } finally {
        release();
      }
    } else {
      // If mutex is locked by another request, wait for it to finish and retry
      await mutex.waitForUnlock();
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Attendance',
    'ActivityTypes',
    'Applications',
    'Dashboard',
    'FinanceCompanies',
    'LeaveRequests',
    'Notifications',
    'Payroll',
    'PerformanceReviews',
    'PlannedActivities',
    'Stages',
    'SmtpSettings',
    'Tabs',
    'Users',
    'VehicleModels',
  ],
  endpoints: () => ({}),
});
