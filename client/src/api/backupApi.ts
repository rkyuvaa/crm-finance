import { baseApi } from './baseApi';

export interface BackupSummary {
  [tableName: string]: number;
}

export interface RestoreResponse {
  status: string;
  message: string;
  restored_tables: Record<string, number>;
}

export const backupApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBackupSummary: builder.query<BackupSummary, void>({
      query: () => '/admin/backup/summary',
    }),
    restoreBackup: builder.mutation<RestoreResponse, { file: File; mode: 'overwrite' | 'merge' }>({
      query: ({ file, mode }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/admin/backup/restore?mode=${mode}`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Dashboard', 'Applications', 'Users', 'Tabs', 'VehicleModels', 'FinanceCompanies'],
    }),
  }),
});

export const { useGetBackupSummaryQuery, useRestoreBackupMutation } = backupApi;
