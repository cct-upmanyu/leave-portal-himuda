import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithToast } from './baseQueryWithToast'

export const leaveTypeApi = createApi({
  reducerPath: 'leaveTypeApi',
  baseQuery: baseQueryWithToast,
  tagTypes: ['LeaveType'],
  endpoints: (builder) => ({
    getLeaveTypes: builder.query({
      query: () => '/api/leave-types',
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((item) => ({ type: 'LeaveType', id: item.id })),
              { type: 'LeaveType', id: 'LIST' },
            ]
          : [{ type: 'LeaveType', id: 'LIST' }],
    }),
    createLeaveType: builder.mutation({
      query: (payload) => ({
        url: '/api/leave-types',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'LeaveType', id: 'LIST' }],
    }),
    updateLeaveType: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/api/leave-types/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'LeaveType', id },
        { type: 'LeaveType', id: 'LIST' },
      ],
    }),
    deleteLeaveType: builder.mutation({
      query: (id) => ({
        url: `/api/leave-types/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'LeaveType', id },
        { type: 'LeaveType', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetLeaveTypesQuery,
  useCreateLeaveTypeMutation,
  useUpdateLeaveTypeMutation,
  useDeleteLeaveTypeMutation,
} = leaveTypeApi
