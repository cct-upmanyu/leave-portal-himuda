import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForgotPasswordMutation } from '../redux/api/authapi'
import AuthFrame from '../components/AuthFrame'
import { toastService } from '../utils/toastService'
import '../styles/Login.css'

function ForgotPassword() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!identifier.trim()) {
      toastService.show({
        severity: 'warn',
        summary: 'Missing fields',
        detail: 'Please enter your username or email.',
        life: 3000,
      })
      return
    }

    try {
      await forgotPassword({ identifier: identifier.trim() }).unwrap()
      navigate('/login', { replace: true })
    } catch (err) {
      // handled by baseQueryWithToast
    }
  }

  return (
    <AuthFrame heading="FORGOT PASSWORD">
      <form onSubmit={handleSubmit}>
        <label className="login-field" htmlFor="identifier">
          <span>Username / E-mail</span>
          <input
            type="text"
            id="identifier"
            name="identifier"
            placeholder="Enter your username or email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <div className="login-options login-options--end">
          <button type="button" className="login-link" onClick={() => navigate('/login')}>
            Back to Login
          </button>
        </div>

        <button type="submit" className="login-submit" disabled={isLoading}>
          {isLoading ? 'SENDING...' : 'SEND RESET LINK'}
        </button>
      </form>
    </AuthFrame>
  )
}

export default ForgotPassword
