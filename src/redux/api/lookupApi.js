import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithToast } from './baseQueryWithToast'

export const lookupApi = createApi({
  reducerPath: 'lookupApi',
  baseQuery: baseQueryWithToast,
  tagTypes: ['Lookup'],
  endpoints: (builder) => ({
    getLookups: builder.query({
      query: (table) => `/api/lookups/${table}`,
      providesTags: (result, error, table) => [{ type: 'Lookup', id: table }],
    }),
    createLookup: builder.mutation({
      query: ({ table, name }) => ({
        url: `/api/lookups/${table}`,
        method: 'POST',
        body: { name },
      }),
      invalidatesTags: (result, error, { table }) => [{ type: 'Lookup', id: table }],
    }),
    updateLookup: builder.mutation({
      query: ({ table, id, name }) => ({
        url: `/api/lookups/${table}/${id}`,
        method: 'PUT',
        body: { name },
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
