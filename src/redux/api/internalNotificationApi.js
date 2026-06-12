import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithToast } from './baseQueryWithToast'

export const internalNotificationApi = createApi({
  reducerPath: 'internalNotificationApi',
  baseQuery: baseQueryWithToast,
  tagTypes: ['InternalNotification'],
  endpoints: (builder) => ({
    getInternalNotifications: builder.query({
      query: (params = {}) => ({
        url: '/api/internal-notifications',
        params,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((item) => ({ type: 'InternalNotification', id: item.id })),
              { type: 'InternalNotification', id: 'LIST' },
          ]
          : [{ type: 'InternalNotification', id: 'LIST' }],
    }),
    getUnreadInternalNotificationCount: builder.query({
      query: () => ({
        url: '/api/internal-notifications/unread-count',
      }),
      providesTags: [{ type: 'InternalNotification', id: 'COUNT' }],
    }),
    markInternalNotificationRead: builder.mutation({
      query: (id) => ({
        url: `/api/internal-notifications/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'InternalNotification', id },
        { type: 'InternalNotification', id: 'LIST' },
        { type: 'InternalNotification', id: 'COUNT' },
      ],
    }),
    markAllInternalNotificationsRead: builder.mutation({
      query: () => ({
        url: '/api/internal-notifications/read-all',
        method: 'PATCH',
      }),
      invalidatesTags: [
        { type: 'InternalNotification', id: 'LIST' },
        { type: 'InternalNotification', id: 'COUNT' },
      ],
    }),
  }),
})

export const {
  useGetInternalNotificationsQuery,
  useGetUnreadInternalNotificationCountQuery,
  useMarkInternalNotificationReadMutation,
  useMarkAllInternalNotificationsReadMutation,
} = internalNotificationApi
