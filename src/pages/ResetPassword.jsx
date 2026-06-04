import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useResetPasswordMutation } from '../redux/api/authapi'
import AuthFrame from '../components/AuthFrame'
import PasswordInput from '../components/PasswordInput'
import { toastService } from '../utils/toastService'
import '../styles/Login.css'

function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get('token') || '', [searchParams])
  const [form, setForm] = useState({
    password: '',
    confirm_password: '',
  })
  const [resetPassword, { isLoading }] = useResetPasswordMutation()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!token) {
      toastService.show({
        severity: 'warn',
        summary: 'Invalid link',
        detail: 'The reset link is missing or invalid.',
        life: 3000,
      })
      return
    }

    if (!form.password || !form.confirm_password) {
      toastService.show({
        severity: 'warn',
        summary: 'Missing fields',
        detail: 'Please fill in all password fields.',
        life: 3000,
      })
      return
    }

    if (form.password !== form.confirm_password) {
      toastService.show({
        severity: 'warn',
        summary: 'Password mismatch',
        detail: 'New password and confirm password must match.',
        life: 3000,
      })
      return
    }

    try {
      await resetPassword({
        reset_password_token: token,
        password: form.password,
        confirm_password: form.confirm_password,
      }).unwrap()
      navigate('/login', { replace: true })
    } catch (err) {
      // handled by baseQueryWithToast
    }
  }

  return (
    <AuthFrame heading="RESET PASSWORD">
      {!token && (
        <p className="login-note">
          The reset link is missing or invalid. Please request a new password reset email.
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <label className="login-field" htmlFor="new-password">
          <span>New Password</span>
          <PasswordInput
            id="new-password"
            name="password"
            placeholder="Enter new password"
            value={form.password}
            onChange={handleInputChange}
            required
            autoComplete="new-password"
          />
        </label>

        <label className="login-field" htmlFor="confirm-password">
          <span>Confirm Password</span>
          <PasswordInput
            id="confirm-password"
            name="confirm_password"
            placeholder="Confirm new password"
            value={form.confirm_password}
            onChange={handleInputChange}
            required
            autoComplete="new-password"
          />
        </label>

        <div className="login-options login-options--end">
          <button type="button" className="login-link" onClick={() => navigate('/login')}>
            Back to Login
          </button>
        </div>

        <button type="submit" className="login-submit" disabled={isLoading || !token}>
          {isLoading ? 'RESETTING...' : 'RESET PASSWORD'}
        </button>
      </form>
    </AuthFrame>
  )
}

export default ResetPassword
