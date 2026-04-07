import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithToast } from './baseQueryWithToast'

export const holidayApi = createApi({
  reducerPath: 'holidayApi',
  baseQuery: baseQueryWithToast,
  tagTypes: ['Holiday'],
  endpoints: (builder) => ({
    getHolidays: builder.query({
      query: () => '/api/holidays',
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((item) => ({ type: 'Holiday', id: item.id })),
              { type: 'Holiday', id: 'LIST' },
            ]
          : [{ type: 'Holiday', id: 'LIST' }],
    }),
    createHoliday: builder.mutation({
      query: (payload) => ({
        url: '/api/holidays',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Holiday', id: 'LIST' }],
    }),
    updateHoliday: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/api/holidays/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Holiday', id },
        { type: 'Holiday', id: 'LIST' },
      ],
    }),
    deleteHoliday: builder.mutation({
      query: (id) => ({
        url: `/api/holidays/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Holiday', id },
        { type: 'Holiday', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetHolidaysQuery,
  useCreateHolidayMutation,
  useUpdateHolidayMutation,
  useDeleteHolidayMutation,
} = holidayApi
