import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithToast } from './baseQueryWithToast'

export const employeeApi = createApi({
  reducerPath: 'employeeApi',
  baseQuery: baseQueryWithToast,
  tagTypes: ['Employees', 'Managers'],
  endpoints: (builder) => ({
    getEmployees: builder.query({
      query: () => '/api/employees',
      providesTags: ['Employees'],
    }),
    getEmployeeById: builder.query({
      query: (id) => `/api/employees/${id}`,
      providesTags: (result, error, id) => [{ type: 'Employees', id }],
    }),
    createEmployee: builder.mutation({
      query: (payload) => ({
        url: '/api/employees',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Employees'],
    }),
    updateEmployee: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/api/employees/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['Employees'],
    }),
    deleteEmployee: builder.mutation({
      query: (id) => ({
        url: `/api/employees/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Employees'],
    }),
    changeEmployeePassword: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/api/employees/${id}/change-password`,
        method: 'POST',
        body: payload,
      }),
    }),
    getManagers: builder.query({
      query: () => '/api/employees/managers',
      providesTags: ['Managers'],
    }),
  }),
})

export const {
  useGetEmployeesQuery,
  useGetEmployeeByIdQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useChangeEmployeePasswordMutation,
  useGetManagersQuery,
} = employeeApi
