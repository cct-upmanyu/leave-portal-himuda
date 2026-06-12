import { fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { toastService } from '../../utils/toastService'
import { clearAuthToken, getAuthToken } from '../../utils/authToken'
import { clearUser, setForcedLogout } from '../slices/authSlice'

const baseUrl = import.meta.env.VITE_API_BASE_URL || ''

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (headers, { arg }) => {
    const hasBody = typeof arg === 'object' && arg !== null && 'body' in arg && arg.body !== undefined
    const token = getAuthToken()

    if (hasBody && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    if (token && !headers.has('x-access-token')) {
      headers.set('x-access-token', token)
    }

    return headers
  },
})

const getMessageFromData = (data) =>
  data?.message || data?.detail || data?.error || data?.msg || ''

const getDefaultSuccess = (method) => {
  if (method === 'POST') return 'Created successfully.'
  if (method === 'PUT' || method === 'PATCH') return 'Updated successfully.'
  if (method === 'DELETE') return 'Deleted successfully.'
  return 'Action completed successfully.'
}

const getAuthSuccess = (url) => {
  if (url?.includes('/api/auth/login')) return 'Login successful.'
  if (url?.includes('/api/auth/logout')) return 'Logged out successfully.'
  if (url?.includes('/api/auth/signup')) return 'Signup successful.'
  if (url?.includes('/api/auth/forgot-password')) return 'Reset link sent successfully.'
  if (url?.includes('/api/auth/reset-password')) return 'Password reset successfully.'
  if (url?.includes('/api/auth/change-password')) return 'Password changed successfully.'
  return ''
}

const getErrorMessage = (error) =>
  error?.data?.error ||
  error?.data?.message ||
  error?.error ||
  'Something went wrong.'

export const baseQueryWithToast = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions)
  const method = typeof args === 'string' ? 'GET' : (args.method || 'GET').toUpperCase()
  const url = typeof args === 'string' ? args : args.url
  const isMutation = method !== 'GET'
  const isAuthEndpoint = typeof url === 'string' && url.includes('/api/auth/')
  const shouldShowErrorToast = isMutation || isAuthEndpoint

  if (result.error) {
    const status = result.error?.status
    const hasAuthToken = Boolean(getAuthToken())

    if (status === 401 && hasAuthToken) {
      clearAuthToken()
      api.dispatch(setForcedLogout())
      api.dispatch(clearUser())
    }

    if (shouldShowErrorToast || (status === 401 && hasAuthToken)) {
      toastService.show({
        severity: status === 401 || status === 403 ? 'warn' : 'error',
        summary: status === 401 || status === 403 ? 'Unauthorized' : 'Request failed',
        detail: getErrorMessage(result.error),
        life: 4000,
      })
    }
    return result
  }

  if (isMutation) {
    const message =
      getAuthSuccess(url) || getMessageFromData(result.data) || getDefaultSuccess(method)
    toastService.show({
      severity: 'success',
      summary: 'Success',
      detail: message,
      life: 2500,
    })
  }

  return result
}
