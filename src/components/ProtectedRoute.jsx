import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

function ProtectedRoute({ children }) {
  const { user, status, forcedLogout } = useSelector((state) => state.auth)

  if (status === 'loading') {
    return null
  }

  if (!user || forcedLogout) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
