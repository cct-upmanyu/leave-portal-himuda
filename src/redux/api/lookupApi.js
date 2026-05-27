import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithToast } from './baseQueryWithToast'

export const lookupApi = createApi({
  reducerPath: 'lookupApi',
  baseQuery: baseQueryWithToast,
  tagTypes: ['Lookup'],
  endpoints: (builder) => ({
    getLookups: builder.query({
      query: (arg) => {
        const table = typeof arg === 'string' ? arg : arg?.table
        const params = typeof arg === 'string' ? undefined : arg?.params
        return {
          url: `/api/lookups/${table}`,
          params,
        }
      },
      providesTags: (result, error, arg) => {
        const table = typeof arg === 'string' ? arg : arg?.table
        return [{ type: 'Lookup', id: table }]
      },
    }),
    createLookup: builder.mutation({
      query: ({ table, ...body }) => ({
        url: `/api/lookups/${table}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { table }) => [{ type: 'Lookup', id: table }],
    }),
    updateLookup: builder.mutation({
      query: ({ table, id, ...body }) => ({
        url: `/api/lookups/${table}/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { table }) => [{ type: 'Lookup', id: table }],
    }),
    deleteLookup: builder.mutation({
      query: ({ table, id }) => ({
        url: `/api/lookups/${table}/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { table }) => [{ type: 'Lookup', id: table }],
    }),
  }),
})

export const {
  useGetLookupsQuery,
  useCreateLookupMutation,
  useUpdateLookupMutation,
  useDeleteLookupMutation,
} = lookupApi
