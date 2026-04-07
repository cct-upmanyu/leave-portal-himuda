import { NavLink } from 'react-router-dom'
import '../styles/Layout.css'

const settingsLinks = [
  { to: '/settings/districts', label: 'Districts' },
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
          Approvals
        </NavLink>
        <NavLink to="/employees" className={navClass}>
          Employees
        </NavLink>
        <NavLink to="/work-diary" className={navClass}>
          Work Diary
        </NavLink>

        <div className="nav-section">Settings</div>
        <div className="nav-sub">
          {settingsLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={subClass}>
              {link.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  )
}

export default Sidebar
