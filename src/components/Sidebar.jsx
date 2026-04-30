import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { isAdminUser } from '../utils/access'
import '../styles/Layout.css'

const settingsLinks = [
  { to: '/settings/districts', label: 'Districts' },
  { to: '/settings/states', label: 'States' },
  { to: '/settings/departments', label: 'Departments' },
  { to: '/settings/leave-types', label: 'Leave Types' },
  { to: '/settings/designations', label: 'Designations' },
  { to: '/settings/holidays', label: 'Holidays' },
  { to: '/settings/holiday-type', label: 'Holiday Type' },
  { to: '/settings/divisions', label: 'Divisions' },
  { to: '/settings/circles', label: 'Circles' },
  { to: '/settings/announcements', label: 'Announcements' },
]

function Sidebar() {
  const user = useSelector((state) => state.auth.user)
  const isAdmin = isAdminUser(user)
  const navClass = ({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')
  const subClass = ({ isActive }) =>
    isActive ? 'nav-sub-item active' : 'nav-sub-item'
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-badge">HP</div>
        <div className="brand-text">
          <span>LEAVE PORTAL</span>
          <small>HIMUDA</small>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={navClass}>
          Dashboard
        </NavLink>
        <NavLink to="/approvals" className={navClass}>
          {isAdmin ? 'Approvals' : 'My Leaves'}
        </NavLink>
        <NavLink to="/employees" className={navClass}>
          {isAdmin ? 'Employees' : 'My Profile'}
        </NavLink>
        <NavLink to="/work-diary" className={navClass}>
          Work Diary
        </NavLink>

        {isAdmin ? (
          <>
            <div className="nav-section">Settings</div>
            <div className="nav-sub">
              {settingsLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={subClass}>
                  {link.label}
                </NavLink>
              ))}
            </div>
          </>
        ) : null}
      </nav>
    </aside>
  )
}

export default Sidebar
