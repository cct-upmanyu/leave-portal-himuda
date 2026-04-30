import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { isAdminUser } from '../utils/access'

function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, status, forcedLogout } = useSelector((state) => state.auth)

  if (status === 'loading') {
    return null
  }

  if (!user || forcedLogout) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && !isAdminUser(user)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default ProtectedRoute
