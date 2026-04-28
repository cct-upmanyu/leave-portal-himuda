import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import ComingSoon from './pages/ComingSoon'
import SettingsLayout from './pages/SettingsLayout'
import SettingsLookupPage from './pages/SettingsLookupPage'
import Test from './pages/Test'
import Employees from './pages/Employees'
import Approvals from './pages/Approvals'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/test" element={<Test />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/work-diary" element={<ComingSoon title="Work Diary" />} />

        <Route path="/settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="/settings/districts" replace />} />
          <Route path="districts" element={<SettingsLookupPage slug="districts" />} />
          <Route path="states" element={<SettingsLookupPage slug="states" />} />
          <Route path="departments" element={<SettingsLookupPage slug="departments" />} />
          <Route path="leave-types" element={<SettingsLookupPage slug="leave-types" />} />
          <Route path="leave-types/:id/:tab" element={<SettingsLookupPage slug="leave-types" />} />
          <Route path="designations" element={<SettingsLookupPage slug="designations" />} />
          <Route path="holidays" element={<SettingsLookupPage slug="holidays" />} />
          <Route path="holiday-type" element={<SettingsLookupPage slug="holiday-type" />} />
          <Route path="divisions" element={<SettingsLookupPage slug="divisions" />} />
          <Route path="circles" element={<SettingsLookupPage slug="circles" />} />
          <Route path="announcements" element={<SettingsLookupPage slug="announcements" />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
