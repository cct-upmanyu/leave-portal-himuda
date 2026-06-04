import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { authApi, useLoginMutation } from '../redux/api/authapi'
import { clearForcedLogout, setUser } from '../redux/slices/authSlice'
import { setAuthToken } from '../utils/authToken'
import { toastService } from '../utils/toastService'
import AuthFrame from '../components/AuthFrame'
import PasswordInput from '../components/PasswordInput'
import '../styles/Login.css'

function Login() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const user = useSelector((state) => state.auth.user)
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  })
  const [rememberMe, setRememberMe] = useState(false)
  const [login, { isLoading }] = useLoginMutation()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setCredentials((prev) => ({ ...prev, [name]: value }))
  }

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate, user])

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!credentials.email || !credentials.password) {
      toastService.show({
        severity: 'warn',
        summary: 'Missing fields',
        detail: 'Please fill in all fields.',
        life: 3000,
      })
      return
    }

    try {
      const response = await login(credentials).unwrap()
      const userPayload = response?.data || response?.user || null
      const token = userPayload?.token || response?.token || null
      const user = userPayload
        ? (({ token: _token, ...rest }) => rest)(userPayload)
        : null

      if (token) {
        setAuthToken(token)
      }

      if (user) {
        dispatch(setUser(user))
        dispatch(clearForcedLogout())
      }
      dispatch(authApi.util.invalidateTags(['Me']))
      if (rememberMe) {
        localStorage.setItem('userEmail', credentials.email)
        localStorage.setItem('rememberMe', 'true')
      }
      navigate('/dashboard')
    } catch (err) {
      // handled by baseQueryWithToast
    }
  }

  return (
    <AuthFrame heading="LOGIN">
      <form onSubmit={handleLogin}>
        <label className="login-field" htmlFor="email">
          <span>Username / E-mail</span>
          <input
            type="text"
            id="email"
            name="email"
            placeholder="Enter your username or email"
            value={credentials.email}
            onChange={handleInputChange}
            required
            autoComplete="username"
          />
        </label>

        <label className="login-field" htmlFor="password">
          <span>Password</span>
          <PasswordInput
            id="password"
            name="password"
            placeholder="Enter your password"
            value={credentials.password}
            onChange={handleInputChange}
            required
            autoComplete="current-password"
          />
        </label>

        <div className="login-options">
          <label className="login-remember">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember me</span>
          </label>
          <button
            type="button"
            className="login-link"
            onClick={() => navigate('/forgot-password')}
          >
            Forgot Password?
          </button>
        </div>

        <button type="submit" className="login-submit" disabled={isLoading}>
          {isLoading ? 'LOGGING IN...' : 'LOGIN'}
        </button>
      </form>
    </AuthFrame>
  )
}

export default Login
