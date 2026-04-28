import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithToast } from './baseQueryWithToast'

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
