import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import ComingSoon from './pages/ComingSoon'
import SettingsLayout from './pages/SettingsLayout'
import SettingsLookupPage from './pages/SettingsLookupPage'
import Test from './pages/Test'
import Employees from './pages/Employees'
import EmployeeDetail from './pages/EmployeeDetail'
import Approvals from './pages/Approvals'
import ActivityLogs from './pages/ActivityLogs'
import NativeDatePickerEnhancer from './components/NativeDatePickerEnhancer'
import './App.css'

function App() {
  return (
    <>
      <NativeDatePickerEnhancer />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
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
          <Route path="/my-leaves" element={<Approvals mode="my-leaves" />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/employees/:id" element={<EmployeeDetail />} />
          <Route
            path="/announcements"
            element={
              <ProtectedRoute requireAdmin>
                <SettingsLookupPage slug="announcements" />
              </ProtectedRoute>
            }
          />
          <Route path="/work-diary" element={<ComingSoon title="Work Diary" />} />

          <Route
            path="/settings"
            element={
              <ProtectedRoute requireAdmin>
                <SettingsLayout />
              </ProtectedRoute>
            }
          >
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
            <Route path="sub-divisions" element={<SettingsLookupPage slug="sub-divisions" />} />
            <Route path="announcements" element={<Navigate to="/announcements" replace />} />
            <Route path="activity-logs" element={<ActivityLogs />} />
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  )
}

export default App
