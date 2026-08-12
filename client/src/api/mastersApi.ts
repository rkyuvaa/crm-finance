import { baseApi } from './baseApi';

import type {
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
      invalidatesTags: ['Stages', 'Dashboard'],
    }),
    updateStage: build.mutation<StageConfig, { id: number; body: Partial<StageInput> }>({
      query: ({ id, body }) => ({ url: `/masters/stages/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Stages', 'Dashboard'],
    }),
    deleteStage: build.mutation<void, number>({
      query: (id) => ({ url: `/masters/stages/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Stages', 'Dashboard'],
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
} = mastersApi;
