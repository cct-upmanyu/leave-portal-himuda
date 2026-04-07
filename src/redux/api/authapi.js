import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithToast } from './baseQueryWithToast'

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithToast,
  tagTypes: ['Me'],
  endpoints: (builder) => ({
    signup: builder.mutation({
      query: (payload) => ({
        url: '/api/auth/signup',
        method: 'POST',
        body: payload,
      }),
    }),
    login: builder.mutation({
      query: (payload) => ({
        url: '/api/auth/login',
        method: 'POST',
        body: payload,
      }),
    }),
    logout: builder.mutation({
      query: () => ({
        url: '/api/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Me'],
    }),
    me: builder.query({
      query: () => ({
        url: '/api/auth/me',
        method: 'GET',
      }),
      providesTags: ['Me'],
    }),
  }),
})

export const { useSignupMutation, useLoginMutation, useLogoutMutation, useMeQuery } = authApi
