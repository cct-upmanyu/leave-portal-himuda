import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useGetLeavesQuery } from '../redux/api/leaveApi'
import { isAdminUser, isReportingManagerUser } from '../utils/access'
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
  const { data: leaveResponse } = useGetLeavesQuery(undefined, { skip: isAdmin })
  const leaves = leaveResponse?.data || []
  const hasAssignedLeaves = leaves.some(
    (leave) =>
      String(leave?.reportingManagerId || '') === String(user?.rowid || '') &&
      String(leave?.userId || '') !== String(user?.rowid || ''),
  )
  const isReportingManager = isReportingManagerUser(user) || hasAssignedLeaves
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
        {isAdmin ? (
          <NavLink to="/approvals" className={navClass}>
            Approvals
          </NavLink>
        ) : (
          <>
            <NavLink to="/my-leaves" className={navClass}>
              My Leaves
            </NavLink>
            {isReportingManager ? (
              <NavLink to="/approvals" className={navClass}>
                Approvals
              </NavLink>
            ) : null}
          </>
        )}
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
