import { baseApi } from './baseApi';

import type { FinanceCompanyOption, VehicleModel, VehicleModelInput } from '@/types';

export const vehicleModelsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    vehicleModels: build.query<VehicleModel[], void>({
      query: () => ({ url: '/masters/vehicle-models' }),
      providesTags: ['VehicleModels'],
    }),
    financeCompanies: build.query<FinanceCompanyOption[], void>({
      query: () => ({ url: '/masters/finance-companies' }),
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
  }),
});

export const {
  useVehicleModelsQuery,
  useFinanceCompaniesQuery,
  useCreateVehicleModelMutation,
  useUpdateVehicleModelMutation,
  useDeleteVehicleModelMutation,
} = vehicleModelsApi;
