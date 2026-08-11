import { baseApi } from './baseApi';

import type { ReportsSummary, StageRow } from '@/types';

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    reportsSummary: build.query<ReportsSummary, void>({
      query: () => '/reports/summary',
    }),
  }),
});

export const stubsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    documents: build.query<StageRow[], void>({
      query: () => '/documents',
    }),
    verifications: build.query<StageRow[], void>({
      query: () => '/verifications',
    }),
    financeSubmissions: build.query<StageRow[], void>({
      query: () => '/finance/submissions',
    }),
    sanctions: build.query<StageRow[], void>({
      query: () => '/sanctions',
    }),
    deliveries: build.query<StageRow[], void>({
      query: () => '/deliveries',
    }),
    disbursements: build.query<StageRow[], void>({
      query: () => '/disbursements',
    }),
  }),
});

export const { useReportsSummaryQuery } = reportsApi;
export const {
  useDocumentsQuery,
  useVerificationsQuery,
  useFinanceSubmissionsQuery,
  useSanctionsQuery,
  useDeliveriesQuery,
  useDisbursementsQuery,
} = stubsApi;
