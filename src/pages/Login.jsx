import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/Login.css'

function Login() {
  const navigate = useNavigate()
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  })
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setCredentials(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleLogin = (e) => {
    e.preventDefault()
    
    // Basic validation
    if (!credentials.email || !credentials.password) {
      setError('Please fill in all fields')
      return
    }

    // Mock authentication - in real app, call API
    if (credentials.email && credentials.password.length >= 6) {
      // Store in localStorage if remember me is checked
      if (rememberMe) {
        localStorage.setItem('userEmail', credentials.email)
        localStorage.setItem('rememberMe', 'true')
      }
      // Navigate to dashboard
      navigate('/dashboard')
    } else {
      setError('Invalid credentials')
    }
  }

  const handleForgotPassword = () => {
    alert('Password reset link has been sent to your email')
  }

  return (
    <div className="login-container">
      {/* Left Side - Welcome Section */}
      <div className="login-left">
        <div className="left-content">
          <h2>Welcome to <span>HIMUDA</span></h2>
          <div className="logo-placeholder">
            <div className="himuda-logo">
              <span>HIMUDA</span>
            </div>
          </div>
          <p className="company-name">HP Housing & Urban Development Authority</p>
          <p className="company-tagline">(A Government Undertaking, Himachal Pradesh)</p>
          <hr className="divider" />
          <h1>LEAVE PORTAL</h1>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-right">
        <div className="form-container">
          <h2>LOGIN</h2>
          
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Employee ID / E-mail</label>
              <input
                type="text"
                id="email"
                name="email"
                placeholder="Enter your employee ID or email"
                value={credentials.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                value={credentials.password}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <p className="forgot-password">
                <button type="button" onClick={handleForgotPassword}>
                  Forgot Password?
                </button>
              </p>
            </div>

            <button type="submit" className="btn-login">LOGIN</button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
