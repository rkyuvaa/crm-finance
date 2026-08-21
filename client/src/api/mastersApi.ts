import { baseApi } from './baseApi';

import type {
  ActivityType,
  ActivityTypeInput,
  CrmTabConfig,
  CrmTabInput,
  FinanceCompanyOption,
  StageConfig,
  StageInput,
  VehicleModel,
  VehicleModelInput,
} from '@/types';

export const mastersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    vehicleModels: build.query<VehicleModel[], void>({
      query: () => ({ url: '/masters/vehicle-models' }),
      providesTags: ['VehicleModels'],
    }),
    createVehicleModel: build.mutation<VehicleModel, VehicleModelInput>({
      query: (body) => ({ url: '/masters/vehicle-models', method: 'POST', body }),
      invalidatesTags: ['VehicleModels'],
    }),
    updateVehicleModel: build.mutation<VehicleModel, { id: number; body: Partial<VehicleModelInput> }>({
      query: ({ id, body }) => ({ url: `/masters/vehicle-models/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['VehicleModels'],
    }),
    deleteVehicleModel: build.mutation<void, number>({
      query: (id) => ({ url: `/masters/vehicle-models/${id}`, method: 'DELETE' }),
      invalidatesTags: ['VehicleModels'],
    }),
    financeCompanies: build.query<FinanceCompanyOption[], void>({
      query: () => ({ url: '/masters/finance-companies' }),
      providesTags: ['FinanceCompanies'],
    }),
    createFinanceCompany: build.mutation<FinanceCompanyOption, { name: string }>({
      query: (body) => ({ url: '/masters/finance-companies', method: 'POST', body }),
      invalidatesTags: ['FinanceCompanies'],
    }),
    updateFinanceCompany: build.mutation<FinanceCompanyOption, { id: number; body: { name: string } }>({
      query: ({ id, body }) => ({ url: `/masters/finance-companies/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['FinanceCompanies'],
    }),
    deleteFinanceCompany: build.mutation<void, number>({
      query: (id) => ({ url: `/masters/finance-companies/${id}`, method: 'DELETE' }),
      invalidatesTags: ['FinanceCompanies'],
    }),
    stages: build.query<StageConfig[], void>({
      query: () => ({ url: '/masters/stages' }),
      providesTags: ['Stages'],
    }),
    createStage: build.mutation<StageConfig, StageInput>({
      query: (body) => ({ url: '/masters/stages', method: 'POST', body }),
      invalidatesTags: ['Stages'],
    }),
    updateStage: build.mutation<StageConfig, { id: number; body: Partial<StageInput> }>({
      query: ({ id, body }) => ({ url: `/masters/stages/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Stages'],
    }),
    deleteStage: build.mutation<void, number>({
      query: (id) => ({ url: `/masters/stages/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Stages'],
    }),
    activityTypes: build.query<ActivityType[], void>({
      query: () => ({ url: '/masters/activity-types' }),
      providesTags: ['ActivityTypes'],
    }),
    createActivityType: build.mutation<ActivityType, ActivityTypeInput>({
      query: (body) => ({ url: '/masters/activity-types', method: 'POST', body }),
      invalidatesTags: ['ActivityTypes'],
    }),
    updateActivityType: build.mutation<ActivityType, { id: number; body: Partial<ActivityTypeInput> }>({
      query: ({ id, body }) => ({ url: `/masters/activity-types/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['ActivityTypes'],
    }),
    deleteActivityType: build.mutation<void, number>({
      query: (id) => ({ url: `/masters/activity-types/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ActivityTypes'],
    }),
    tabs: build.query<CrmTabConfig[], void>({
      query: () => ({ url: '/masters/tabs' }),
      providesTags: ['Tabs'],
    }),
    createTab: build.mutation<CrmTabConfig, CrmTabInput>({
      query: (body) => ({ url: '/masters/tabs', method: 'POST', body }),
      invalidatesTags: ['Tabs'],
    }),
    updateTab: build.mutation<CrmTabConfig, { id: number; body: Partial<CrmTabInput> }>({
      query: ({ id, body }) => ({ url: `/masters/tabs/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Tabs'],
    }),
    deleteTab: build.mutation<void, number>({
      query: (id) => ({ url: `/masters/tabs/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Tabs'],
    }),
  }),
});

export const {
  useVehicleModelsQuery,
  useCreateVehicleModelMutation,
  useUpdateVehicleModelMutation,
  useDeleteVehicleModelMutation,
  useFinanceCompaniesQuery,
  useCreateFinanceCompanyMutation,
  useUpdateFinanceCompanyMutation,
  useDeleteFinanceCompanyMutation,
  useStagesQuery,
  useCreateStageMutation,
  useUpdateStageMutation,
  useDeleteStageMutation,
  useActivityTypesQuery,
  useCreateActivityTypeMutation,
  useUpdateActivityTypeMutation,
  useDeleteActivityTypeMutation,
  useTabsQuery,
  useCreateTabMutation,
  useUpdateTabMutation,
  useDeleteTabMutation,
} = mastersApi;
