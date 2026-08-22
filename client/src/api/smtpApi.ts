import { baseApi } from './baseApi';
import type { SmtpSetting, SmtpSettingInput } from '@/types';

export const smtpApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSmtpSettings: build.query<SmtpSetting, void>({
      query: () => ({ url: '/smtp-settings' }),
      providesTags: ['SmtpSettings'],
    }),
    updateSmtpSettings: build.mutation<SmtpSetting, SmtpSettingInput>({
      query: (body) => ({
        url: '/smtp-settings',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['SmtpSettings'],
    }),
    testSmtpConnection: build.mutation<{ success: boolean; message: string }, { test_email: string }>({
      query: (body) => ({
        url: '/smtp-settings/test',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetSmtpSettingsQuery,
  useUpdateSmtpSettingsMutation,
  useTestSmtpConnectionMutation,
} = smtpApi;
