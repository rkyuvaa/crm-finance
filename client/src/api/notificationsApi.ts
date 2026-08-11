import { baseApi } from './baseApi';

import type { NotificationItem } from '@/types';

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    notifications: build.query<NotificationItem[], void>({
      query: () => '/users/me/notifications',
      providesTags: ['Notifications'],
    }),
    markRead: build.mutation<NotificationItem, number>({
      query: (id) => ({ url: `/users/me/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Notifications', 'Dashboard'],
    }),
    markAllRead: build.mutation<void, void>({
      query: () => ({ url: '/users/me/notifications/read-all', method: 'POST' }),
      invalidatesTags: ['Notifications', 'Dashboard'],
    }),
  }),
});

export const { useNotificationsQuery, useMarkReadMutation, useMarkAllReadMutation } =
  notificationsApi;
