import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMeQuery } from '../redux/api/authapi'
import {
  clearForcedLogout,
  clearUser,
  setAuthLoading,
  setUser,
} from '../redux/slices/authSlice'
import { clearAuthToken } from '../utils/authToken'

const getUserFromResponse = (response) => {
  return response?.data || response?.user || null
}

function AuthInitializer({ children }) {
  const dispatch = useDispatch()
  const { user, forcedLogout } = useSelector((state) => state.auth)
  const navigate = useNavigate()
  const location = useLocation()
  const { data, isLoading, isSuccess, isError } = useMeQuery(undefined, {
    skip: Boolean(user) || forcedLogout,
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: true,
  })
  const isPublicRoute = location.pathname === '/login' || location.pathname === '/test'

  useEffect(() => {
    if (isLoading) {
      dispatch(setAuthLoading())
    }
  }, [dispatch, isLoading])

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
    if (isError || (isSuccess && !getUserFromResponse(data))) {
      clearAuthToken()
      dispatch(clearUser())
      if (!isPublicRoute) {
        navigate('/login', { replace: true })
      }
    }
  }, [data, dispatch, isError, isSuccess, isPublicRoute, location.pathname, navigate])

  return children
}

export default AuthInitializer
