import { Outlet } from 'react-router-dom'
import '../styles/Settings.css'

function SettingsLayout() {
  return (
    <div className="settings-layout">
      <section className="settings-content">
        <Outlet />
      </section>
    </div>
  )
}

export default SettingsLayout
