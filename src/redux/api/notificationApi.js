import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithToast } from './baseQueryWithToast'

export const notificationApi = createApi({
  reducerPath: 'notificationApi',
  baseQuery: baseQueryWithToast,
  tagTypes: ['Notification'],
  endpoints: (builder) => ({
    getNotifications: builder.query({
      query: () => '/api/notifications',
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((item) => ({ type: 'Notification', id: item.id })),
              { type: 'Notification', id: 'LIST' },
            ]
          : [{ type: 'Notification', id: 'LIST' }],
    }),
    createNotification: builder.mutation({
      query: (payload) => ({
        url: '/api/notifications',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
    updateNotification: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/api/notifications/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    deleteNotification: builder.mutation({
      query: (id) => ({
        url: `/api/notifications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetNotificationsQuery,
  useCreateNotificationMutation,
  useUpdateNotificationMutation,
  useDeleteNotificationMutation,
} = notificationApi
