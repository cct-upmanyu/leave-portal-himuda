import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithToast } from './baseQueryWithToast'

export const activityLogApi = createApi({
  reducerPath: 'activityLogApi',
  baseQuery: baseQueryWithToast,
  tagTypes: ['ActivityLog'],
  endpoints: (builder) => ({
    getActivityLogs: builder.query({
      query: (params = {}) => ({
        url: '/api/activity-logs',
        params,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((item) => ({ type: 'ActivityLog', id: item.id })),
              { type: 'ActivityLog', id: 'LIST' },
            ]
          : [{ type: 'ActivityLog', id: 'LIST' }],
    }),
  }),
})

export const { useGetActivityLogsQuery } = activityLogApi
