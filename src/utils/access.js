export const getRoleId = (user) => String(user?.roleId || user?.role_id || '')

export const isAdminUser = (user) => getRoleId(user) === '1'

export const isReportingManagerUser = (user) => Boolean(user?.isReportingManager)

export const getUserDisplayName = (user) =>
  user?.displayName || user?.username || user?.email?.split('@')[0] || 'User'

export const getUserRoleLabel = (user) => {
  if (isAdminUser(user)) return 'Admin'
  if (isReportingManagerUser(user)) return 'Reporting Manager'
  return 'Employee'
}
