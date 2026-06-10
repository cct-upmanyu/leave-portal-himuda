import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithToast } from './baseQueryWithToast'

export const employeeApi = createApi({
  reducerPath: 'employeeApi',
  baseQuery: baseQueryWithToast,
  tagTypes: ['Employees', 'Managers', 'EmployeeBalances'],
  keepUnusedDataFor: 0,
  endpoints: (builder) => ({
    getEmployees: builder.query({
      query: () => ({
        url: '/api/employees',
        cache: 'no-store',
      }),
      providesTags: ['Employees'],
    }),
    getEmployeeById: builder.query({
      query: (id) => ({
        url: `/api/employees/${id}`,
        cache: 'no-store',
      }),
      providesTags: (result, error, id) => [{ type: 'Employees', id }],
      refetchOnMountOrArgChange: true,
    }),
    getEmployeeLeaveBalances: builder.query({
      query: (arg) => {
        const id = typeof arg === 'object' && arg !== null ? arg.id : arg
        return {
          url: `/api/employees/${id}/leave-balances`,
          cache: 'no-store',
        }
      },
      providesTags: (result, error, arg) => [
        { type: 'EmployeeBalances', id: typeof arg === 'object' && arg !== null ? arg.id : arg },
      ],
      refetchOnMountOrArgChange: true,
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
