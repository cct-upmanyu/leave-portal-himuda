import { NavLink, Outlet } from 'react-router-dom'
import '../styles/Settings.css'

const links = [
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

function SettingsLayout() {
  const linkClass = ({ isActive }) =>
    isActive ? 'settings-link active' : 'settings-link'
  return (
    <div className="settings-layout">
      <section className="settings-content">
        <Outlet />
      </section>
    </div>
  )
}

export default SettingsLayout
