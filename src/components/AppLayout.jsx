import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Sidebar from './Sidebar'
import '../styles/Layout.css'
import { authApi, useLogoutMutation } from '../redux/api/authapi'
import { clearUser, setForcedLogout } from '../redux/slices/authSlice'
import { clearAuthToken } from '../utils/authToken'
import { getUserDisplayName, getUserRoleLabel, isAdminUser } from '../utils/access'

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
  const [logout, { isLoading }] = useLogoutMutation()
  const user = useSelector((state) => state.auth.user)
  const isAdmin = isAdminUser(user)

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
  }, [location.pathname])

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
            <div className="topbar-user">
              <div className="avatar">A</div>
              <div>
                <div className="user-name">{getUserDisplayName(user)}</div>
                <div className="user-role">{getUserRoleLabel(user)}</div>
              </div>
            </div>
            <button className="btn-logout" onClick={handleLogout} disabled={isLoading}>
              {isLoading ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
