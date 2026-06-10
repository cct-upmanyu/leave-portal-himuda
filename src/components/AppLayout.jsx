import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Sidebar from './Sidebar'
import '../styles/Layout.css'
import { authApi, useChangePasswordMutation, useLogoutMutation } from '../redux/api/authapi'
import { clearUser, setForcedLogout } from '../redux/slices/authSlice'
import { clearAuthToken } from '../utils/authToken'
import { getUserDisplayName, getUserRoleLabel } from '../utils/access'
import { toastService } from '../utils/toastService'
import PasswordInput from './PasswordInput'
import NotificationBell from './NotificationBell'

const getTitle = (pathname) => {
  if (pathname.startsWith('/settings')) {
    const label = pathname.split('/')[2]?.replace('-', ' ') || 'settings'
    const title = label
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
    return `Settings • ${title}`
  }
  if (pathname === '/dashboard') return 'Dashboard'
  if (pathname === '/approvals') return 'Approvals'
  if (pathname === '/my-leaves') return 'My Leaves'
  if (pathname === '/employees') return 'Employees'
  if (pathname.startsWith('/employees/')) return 'Employee Detail'
  if (pathname === '/announcements') return 'Announcements'
  if (pathname === '/work-diary') return 'Work Diary'
  return 'Leave Portal'
}

function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    confirm_password: '',
  })
  const [logout, { isLoading }] = useLogoutMutation()
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation()
  const user = useSelector((state) => state.auth.user)
  const profileMenuRef = useRef(null)

  const handleLogout = async () => {
    try {
      await logout().unwrap()
    } finally {
      clearAuthToken()
      dispatch(setForcedLogout())
      dispatch(clearUser())
      dispatch(authApi.util.resetApiState())
      navigate('/login', { replace: true })
    }
  }

  useEffect(() => {
    setIsSidebarOpen(false)
    setIsProfileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target
    setPasswordForm(prev => ({ ...prev, [name]: value }))
  }

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false)
    setPasswordForm({
      current_password: '',
      password: '',
      confirm_password: '',
    })
  }

  const openPasswordModal = () => {
    setIsProfileMenuOpen(false)
    setIsPasswordModalOpen(true)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (!passwordForm.current_password || !passwordForm.password || !passwordForm.confirm_password) {
      toastService.show({
        severity: 'warn',
        summary: 'Missing fields',
        detail: 'Please fill in all password fields.',
        life: 3000,
      })
      return
    }

    if (passwordForm.password !== passwordForm.confirm_password) {
      toastService.show({
        severity: 'warn',
        summary: 'Password mismatch',
        detail: 'New password and confirm password must match.',
        life: 3000,
      })
      return
    }

    try {
      await changePassword(passwordForm).unwrap()
      closePasswordModal()
    } catch (err) {
      // handled by baseQueryWithToast
    }
  }

  return (
    <div className={`app-shell ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <button
        type="button"
        className="sidebar-backdrop"
        aria-label="Close navigation menu"
        onClick={() => setIsSidebarOpen(false)}
      />
      <Sidebar onClose={() => setIsSidebarOpen(false)} />
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-title-row">
            <button
              type="button"
              className="menu-toggle"
              aria-label="Open navigation menu"
              aria-expanded={isSidebarOpen}
              onClick={() => setIsSidebarOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>
            <div>
              <h1>{getTitle(location.pathname)}</h1>
              <p className="topbar-subtitle">HIMUDA Leave Management</p>
            </div>
          </div>
          <div className="topbar-actions">
            <NotificationBell />
            <div className="topbar-profile" ref={profileMenuRef}>
              <button
                type="button"
                className="topbar-user topbar-user-button"
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
                onClick={() => setIsProfileMenuOpen((current) => !current)}
              >
                <div className="avatar">A</div>
                <div className="topbar-user-copy">
                  <div className="user-name">{getUserDisplayName(user)}</div>
                  <div className="user-role">{getUserRoleLabel(user)}</div>
                </div>
                <span className="profile-caret" aria-hidden="true" />
              </button>

              {isProfileMenuOpen ? (
                <div className="profile-menu" role="menu">
                  <button type="button" className="profile-menu-item" role="menuitem" onClick={openPasswordModal}>
                    Change Password
                  </button>
                  <button
                    type="button"
                    className="profile-menu-item danger"
                    role="menuitem"
                    onClick={handleLogout}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Logging out...' : 'Logout'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
      {isPasswordModalOpen && (
        <div className="password-modal-backdrop" role="presentation">
          <div className="password-modal" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
            <div className="password-modal-header">
              <div>
                <h2 id="change-password-title">Change Password</h2>
                <p>Update the password for your account.</p>
              </div>
              <button type="button" className="password-modal-close" aria-label="Close" onClick={closePasswordModal}>
                X
              </button>
            </div>
            <form className="password-form" onSubmit={handleChangePassword}>
              <label>
                <span>Current Password</span>
                <PasswordInput
                  id="current-password"
                  name="current_password"
                  value={passwordForm.current_password}
                  onChange={handlePasswordInputChange}
                  required
                  autoComplete="current-password"
                />
              </label>
              <label>
                <span>New Password</span>
                <PasswordInput
                  id="new-password"
                  name="password"
                  value={passwordForm.password}
                  onChange={handlePasswordInputChange}
                  required
                  autoComplete="new-password"
                />
              </label>
              <label>
                <span>Confirm Password</span>
                <PasswordInput
                  id="confirm-password"
                  name="confirm_password"
                  value={passwordForm.confirm_password}
                  onChange={handlePasswordInputChange}
                  required
                  autoComplete="new-password"
                />
              </label>
              <div className="password-modal-actions">
                <button type="button" className="btn-password-secondary" onClick={closePasswordModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-password-primary" disabled={isChangingPassword}>
                  {isChangingPassword ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AppLayout
