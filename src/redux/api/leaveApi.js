import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithToast } from './baseQueryWithToast'
import { internalNotificationApi } from './internalNotificationApi'

export const leaveApi = createApi({
  reducerPath: 'leaveApi',
  baseQuery: baseQueryWithToast,
  tagTypes: ['Leaves', 'Leave'],
  endpoints: (builder) => ({
    getLeaves: builder.query({
      query: () => '/api/leaves',
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((item) => ({ type: 'Leave', id: item.id })),
              { type: 'Leaves', id: 'LIST' },
            ]
          : [{ type: 'Leaves', id: 'LIST' }],
    }),
    getLeaveById: builder.query({
      query: (id) => `/api/leaves/${id}`,
      providesTags: (result, error, id) => [{ type: 'Leave', id }],
    }),
    createLeave: builder.mutation({
      query: (payload) => ({
        url: '/api/leaves',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Leaves', id: 'LIST' }],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
          dispatch(
            internalNotificationApi.util.invalidateTags([
              { type: 'InternalNotification', id: 'LIST' },
            ]),
          )
        } catch (error) {
          // The leave mutation already surfaces errors through the shared toast layer.
        }
      },
    }),
    updateLeave: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/api/leaves/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'Leaves', id: 'LIST' },
        { type: 'Leave', id: arg.id },
      ],
    }),
    deleteLeave: builder.mutation({
      query: (id) => ({
        url: `/api/leaves/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Leaves', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetLeavesQuery,
  useGetLeaveByIdQuery,
  useCreateLeaveMutation,
  useUpdateLeaveMutation,
  useDeleteLeaveMutation,
} = leaveApi
