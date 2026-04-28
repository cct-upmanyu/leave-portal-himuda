import { fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { toastService } from '../../utils/toastService'

const baseUrl = import.meta.env.VITE_API_BASE_URL || ''

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  credentials: 'include',
  prepareHeaders: (headers, { arg }) => {
    const hasBody = typeof arg === 'object' && arg !== null && 'body' in arg && arg.body !== undefined

    if (hasBody && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
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
  const isSilentEndpoint = api?.endpoint === 'me'

  if (result.error) {
    if (!isSilentEndpoint) {
      const status = result.error?.status
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
