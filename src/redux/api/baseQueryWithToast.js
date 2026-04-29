import { fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { toastService } from '../../utils/toastService'
import { getAuthToken } from '../../utils/authToken'

const defaultProductionBaseUrl = 'https://leave-portal-60068167284.catalystserverless.in/server/leave-portal-backend/'

const normalizeBaseUrl = (value) => {
  if (!value) {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return '/server/leave-portal-backend/'
    }

    return defaultProductionBaseUrl
  }

  return value.endsWith('/') ? value : `${value}/`
}

const baseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL)

const parseResponse = async (response) => {
  const text = await response.text()

  if (!text) {
    return null
  }

  const trimmed = text.trim()
  const contentType = response.headers.get('content-type') || ''
  const looksLikeJson =
    contentType.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[')

  if (looksLikeJson) {
    return JSON.parse(trimmed)
  }

  if (trimmed.toLowerCase().startsWith('<!doctype') || trimmed.toLowerCase().startsWith('<html')) {
    throw new Error('API returned HTML instead of JSON. Check the deployed API base URL and server routing.')
  }

  return trimmed
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  responseHandler: parseResponse,
  prepareHeaders: (headers, { arg }) => {
    const hasBody = typeof arg === 'object' && arg !== null && 'body' in arg && arg.body !== undefined
    const token = getAuthToken()

    if (hasBody && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
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
  error?.data?.message ||
  error?.data?.error ||
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
    if (shouldShowErrorToast) {
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
