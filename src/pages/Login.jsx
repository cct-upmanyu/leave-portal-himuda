import { useState } from 'react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useSelector } from 'react-redux'
import { authApi, useLoginMutation } from '../redux/api/authapi'
import { clearForcedLogout, setUser } from '../redux/slices/authSlice'
import { toastService } from '../utils/toastService'
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
    setCredentials(prev => ({ ...prev, [name]: value }))
  }

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate, user])

  const handleLogin = async (e) => {
    e.preventDefault()
    
    // Basic validation
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
      const user = response?.data || response?.user || null
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

  const handleForgotPassword = () => {
    toastService.show({
      severity: 'info',
      summary: 'Password reset',
      detail: 'Password reset link has been sent to your email.',
      life: 3500,
    })
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <section className="login-panel login-panel--left">
          <div className="login-left-content">
            <p className="login-welcome">Welcome to <span>HIMUDA</span></p>
            <div className="login-logo-ring" aria-hidden="true">
              <div className="login-logo-inner">HIMUDA</div>
            </div>
            <p className="login-org">HP Housing & Urban Development Authority</p>
            <p className="login-tagline">(A Government Undertaking, Himachal Pradesh)</p>
            <div className="login-divider" />
            <h1 className="login-title">LEAVE PORTAL</h1>
          </div>
        </section>

        <section className="login-panel login-panel--right">
          <div className="login-form">
            <h2>LOGIN</h2>

            <form onSubmit={handleLogin}>
              <label className="login-field" htmlFor="email">
                <span>Employee ID / E-mail</span>
                <input
                  type="text"
                  id="email"
                  name="email"
                  placeholder="Enter your employee ID or email"
                  value={credentials.email}
                  onChange={handleInputChange}
                  required
                />
              </label>

              <label className="login-field" htmlFor="password">
                <span>Password</span>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  value={credentials.password}
                  onChange={handleInputChange}
                  required
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
                <button type="button" className="login-link" onClick={handleForgotPassword}>
                  Forgot Password?
                </button>
              </div>

              <button type="submit" className="login-submit" disabled={isLoading}>
                {isLoading ? 'LOGGING IN...' : 'LOGIN'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Login
