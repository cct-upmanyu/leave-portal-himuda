import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithToast } from './baseQueryWithToast'

export const employeeApi = createApi({
  reducerPath: 'employeeApi',
  baseQuery: baseQueryWithToast,
  tagTypes: ['Employees', 'Managers', 'EmployeeBalances'],
  endpoints: (builder) => ({
    getEmployees: builder.query({
      query: () => '/api/employees',
      providesTags: ['Employees'],
    }),
    getEmployeeById: builder.query({
      query: (id) => `/api/employees/${id}`,
      providesTags: (result, error, id) => [{ type: 'Employees', id }],
    }),
    getEmployeeLeaveBalances: builder.query({
      query: (id) => `/api/employees/${id}/leave-balances`,
      providesTags: (result, error, id) => [{ type: 'EmployeeBalances', id }],
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
    updateEmployeeLeaveBalance: builder.mutation({
      query: ({ id, leaveTypeId, ...payload }) => ({
        url: `/api/employees/${id}/leave-balances/${leaveTypeId}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'EmployeeBalances', id: arg.id },
        { type: 'Employees', id: arg.id },
        'ActivityLog',
      ],
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
  useGetEmployeeLeaveBalancesQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useUpdateEmployeeLeaveBalanceMutation,
  useDeleteEmployeeMutation,
  useChangeEmployeePasswordMutation,
  useGetManagersQuery,
} = employeeApi
