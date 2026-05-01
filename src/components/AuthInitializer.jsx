import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMeQuery } from '../redux/api/authapi'
import AuthScreenLoader from './AuthScreenLoader'
import {
  clearForcedLogout,
  clearUser,
  setAuthLoading,
  setUser,
} from '../redux/slices/authSlice'
import { clearAuthToken, getAuthToken } from '../utils/authToken'

const getUserFromResponse = (response) => {
  return response?.data || response?.user || null
}

function AuthInitializer({ children }) {
  const dispatch = useDispatch()
  const { user, forcedLogout } = useSelector((state) => state.auth)
  const navigate = useNavigate()
  const location = useLocation()
  const token = getAuthToken()
  const { data, error, isLoading, isSuccess, isError } = useMeQuery(undefined, {
    skip: Boolean(user) || forcedLogout || !token,
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: true,
  })
  const isPublicRoute = location.pathname === '/login' || location.pathname === '/test'
  const isUnauthorized = isError && (error?.status === 401 || error?.status === 403)
  const shouldRestoreSession = Boolean(token) && !user && !forcedLogout
  const showAuthLoader = shouldRestoreSession && (isLoading || (!isSuccess && !isError))

  useEffect(() => {
    if (showAuthLoader) {
      dispatch(setAuthLoading())
    }
  }, [dispatch, showAuthLoader])

  useEffect(() => {
    if (forcedLogout) {
      clearAuthToken()
      dispatch(clearUser())
      if (!isPublicRoute) {
        navigate('/login', { replace: true })
      }
      return
    }
    if (user) {
      if (location.pathname === '/login') {
        navigate('/dashboard', { replace: true })
      }
      return
    }
    if (!token) {
      dispatch(clearUser())
      if (!isPublicRoute) {
        navigate('/login', { replace: true })
      }
      return
    }
    if (isSuccess) {
      const user = getUserFromResponse(data)
      if (user) {
        dispatch(setUser(user))
        dispatch(clearForcedLogout())
        if (location.pathname === '/login') {
          navigate('/dashboard', { replace: true })
        }
        return
      }
    }
    if (isUnauthorized || (isSuccess && !getUserFromResponse(data))) {
      clearAuthToken()
      dispatch(clearUser())
      if (!isPublicRoute) {
        navigate('/login', { replace: true })
      }
    }
  }, [data, dispatch, isPublicRoute, isSuccess, isUnauthorized, location.pathname, navigate, token])

  if (showAuthLoader) {
    return <AuthScreenLoader />
  }

  return children
}

export default AuthInitializer
