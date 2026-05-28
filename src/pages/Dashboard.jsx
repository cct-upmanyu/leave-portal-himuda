import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useGetEmployeeLeaveBalancesQuery, useGetEmployeesQuery } from '../redux/api/employeeApi'
import { useGetHolidaysQuery } from '../redux/api/holidayApi'
import { useGetLeavesQuery } from '../redux/api/leaveApi'
import { useGetLeaveTypesQuery } from '../redux/api/leaveTypeApi'
import { useGetLookupsQuery } from '../redux/api/lookupApi'
import { useGetNotificationsQuery } from '../redux/api/notificationApi'
import { getUserDisplayName, isAdminUser, isReportingManagerUser } from '../utils/access'
import '../styles/Dashboard.css'

const STATUS_COPY = {
  approved: 'Approved',
  pending: 'Pending',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
}

const formatFullDate = (value) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

const formatShortDate = (value) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatFriendlyDateRange = (start, end) => {
  if (!start || !end) return '-'
  if (start === end) return formatShortDate(start)
  return `${formatShortDate(start)} - ${formatShortDate(end)}`
}

const normalizeDate = (value) => {
  if (!value) return ''
  const raw = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(raw)) {
    return raw.slice(0, 10)
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split('-')
    return `${year}-${month}-${day}`
  }
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isAnnouncementActive = (notification, todayString) => {
  const endDate = normalizeDate(notification?.endDate)
  if (!endDate) return true
  return endDate >= todayString
}

const getLocalDateString = (value = new Date()) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDays = (date, days) => {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

const getEmployeeName = (employee) => {
  if (!employee) return 'Unknown employee'
  const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(' ').trim()
  return fullName || employee.user_name || employee.email || 'Unknown employee'
}

const getEmployeeUserId = (employee) =>
  String(employee?.emp_id || employee?.employeeUserId || employee?.rowid || employee?.id || '')

const getInitials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'LP'

const getStatusClass = (status) => {
  const normalized = String(status || 'pending').toLowerCase()
  return `dashboard-badge dashboard-badge-${normalized}`
}

const getAnnouncementItems = (notifications) => {
  if (notifications.length <= 1) return notifications
  return [...notifications, ...notifications]
}

const formatLeaveValue = (value) => {
  const numericValue = Number(value || 0)
  if (!Number.isFinite(numericValue)) return '0'
  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2)
}

function Dashboard() {
  const navigate = useNavigate()
  const user = useSelector((state) => state.auth.user)
  const isAdmin = isAdminUser(user)
  const isReportingManager = isReportingManagerUser(user)
  const myLeavesRoute = '/my-leaves'
  const approvalsRoute = '/approvals'

  const { data: employeesData, isLoading: employeesLoading } = useGetEmployeesQuery()
  const { data: leavesData, isLoading: leavesLoading } = useGetLeavesQuery()
  const { data: holidaysData, isLoading: holidaysLoading } = useGetHolidaysQuery()
  const { data: notificationsData, isLoading: notificationsLoading } = useGetNotificationsQuery()
  const { data: leaveTypesData } = useGetLeaveTypesQuery()
  const { data: holidayTypesData } = useGetLookupsQuery('holiday_type')

  const employees = employeesData?.data || []
  const leaves = leavesData?.data || []
  const holidays = holidaysData?.data || []
  const notifications = notificationsData?.data || []
  const leaveTypes = leaveTypesData?.data || []
  const holidayTypes = holidayTypesData?.data || []

  const today = new Date()
  const todayString = getLocalDateString(today)
  const nextWeekString = getLocalDateString(addDays(today, 7))
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const todayMonthDay = `${today.getMonth() + 1}-${today.getDate()}`

  const employeeMap = new Map(employees.map((employee) => [String(employee.emp_id || employee.id || ''), employee]))
  const currentEmployee =
    employees.find((employee) => getEmployeeUserId(employee) === String(user?.rowid || '')) || null
  const holidayTypeMap = new Map(holidayTypes.map((item) => [String(item.id), item.name]))
  const leaveTypeMap = new Map(leaveTypes.map((item) => [String(item.id), item.name]))
  const { data: employeeLeaveBalancesData, isLoading: leaveBalancesLoading } =
    useGetEmployeeLeaveBalancesQuery(currentEmployee?.id, {
      skip: isAdmin || !currentEmployee?.id,
    })
  const employeeLeaveBalances = employeeLeaveBalancesData?.data || []

  const normalizedLeaves = leaves.map((leave) => {
    const employee = employeeMap.get(String(leave.userId))
    return {
      ...leave,
      employeeName: leave.employeeName || getEmployeeName(employee),
      leaveTypeName: leave.leaveTypeName || leave.leaveType || leaveTypeMap.get(String(leave.leaveTypeId)) || 'Leave',
      status: String(leave.status || 'pending').toLowerCase(),
    }
  })

  const ownLeaves = normalizedLeaves.filter((leave) => String(leave.userId || '') === String(user?.rowid || ''))
  const managedLeaves = normalizedLeaves.filter(
    (leave) =>
      String(leave.reportingManagerId || '') === String(user?.rowid || '') &&
      String(leave.userId || '') !== String(user?.rowid || ''),
  )
  const effectiveReportingManager = isReportingManager || managedLeaves.length > 0

  const approvedLeaves = normalizedLeaves.filter((leave) => leave.status === 'approved')
  const pendingLeaves = normalizedLeaves.filter((leave) => leave.status === 'pending')
  const activeLeaves = approvedLeaves.filter((leave) => {
    const startDate = normalizeDate(leave.startDate)
    const endDate = normalizeDate(leave.endDate)
    return startDate && endDate && startDate <= todayString && endDate >= todayString
  })

  const upcomingLeaves = normalizedLeaves
    .filter((leave) => {
      if (leave.status === 'cancelled' || leave.status === 'rejected') return false
      const startDate = normalizeDate(leave.startDate)
      const endDate = normalizeDate(leave.endDate)
      return startDate && endDate && startDate <= nextWeekString && endDate >= todayString
    })
    .sort((a, b) => {
      const left = new Date(a.startDate || a.createdAt || 0).getTime()
      const right = new Date(b.startDate || b.createdAt || 0).getTime()
      return left - right
    })
    .slice(0, 5)

  const activeNotifications = notifications.filter((item) => isAnnouncementActive(item, todayString))
  const announcementItems = getAnnouncementItems(activeNotifications.slice(0, 4))

  const upcomingHolidays = holidays
    .map((holiday) => ({
      ...holiday,
      normalizedDate: normalizeDate(holiday.holidayDate),
      holidayTypeName:
        holiday.holidayTypeName ||
        holiday.type ||
        holidayTypeMap.get(String(holiday.holidayTypeId)) ||
        'Holiday',
    }))
    .filter((holiday) => holiday.normalizedDate && holiday.normalizedDate >= todayString)
    .sort((a, b) => a.normalizedDate.localeCompare(b.normalizedDate))
    .slice(0, 6)

  const birthdaysToday = employees.filter((employee) => {
    const value = normalizeDate(employee.dob || employee.date_of_birth)
    if (!value) return false
    const parsed = new Date(`${value}T00:00:00`)
    return `${parsed.getMonth() + 1}-${parsed.getDate()}` === todayMonthDay
  })

  const anniversariesToday = employees.filter((employee) => {
    const value = normalizeDate(employee.date_of_joining)
    if (!value) return false
    const parsed = new Date(`${value}T00:00:00`)
    return `${parsed.getMonth() + 1}-${parsed.getDate()}` === todayMonthDay
  })

  const currentMonthJoiners = employees.filter((employee) => {
    const value = normalizeDate(employee.date_of_joining)
    if (!value) return false
    const parsed = new Date(`${value}T00:00:00`)
    return parsed.getMonth() === currentMonth && parsed.getFullYear() === currentYear
  }).length

  const leaveBalanceCards = employeeLeaveBalances.map((item) => {
    const total = Number(item.totalAllowed || 0)
    const remainingBalance = Number(item.remainingBalance || 0)
    const takenLeaves = Math.max(total - remainingBalance, 0)
    const progress = total > 0 ? Math.min((remainingBalance / total) * 100, 100) : 0

    return {
      id: item.leaveTypeId,
      name: item.leaveTypeName,
      total,
      remainingBalance,
      takenLeaves,
      progress,
    }
  })

  const dashboardStats = isAdmin
    ? [
        {
          title: 'Total Employees',
          value: employees.length,
          caption: `${currentMonthJoiners} joined this month`,
          icon: 'pi-users',
          accent: 'teal',
          action: () => navigate('/employees'),
          actionLabel: 'View employees',
        },
        {
          title: 'Pending Approvals',
          value: pendingLeaves.length,
          caption: pendingLeaves.length ? 'Needs review in approvals' : 'No pending requests',
          icon: 'pi-inbox',
          accent: 'amber',
          action: () => navigate('/approvals'),
          actionLabel: 'Open approvals',
        },
        {
          title: 'Employees On Leave',
          value: activeLeaves.length,
          caption: activeLeaves.length ? 'Active approved leave today' : 'Everyone is currently available',
          icon: 'pi-calendar-clock',
          accent: 'blue',
          action: () => navigate('/approvals'),
          actionLabel: 'See leave activity',
        },
        {
          title: 'Leave Policies',
          value: leaveTypes.length,
          caption: leaveTypes.length ? 'Configured leave types in settings' : 'No leave type configured',
          icon: 'pi-briefcase',
          accent: 'rose',
          action: () => navigate('/settings/leave-types'),
          actionLabel: 'Manage leave types',
        },
      ]
    : [
        {
          title: 'My Profile',
          value: employees.length ? 'Ready' : 'Pending',
          caption: employees.length ? 'Your profile details are available' : 'Profile details are not available',
          icon: 'pi-user',
          accent: 'teal',
          action: () => navigate('/employees'),
          actionLabel: 'Open profile',
        },
        {
          title: 'My Leaves',
          value: ownLeaves.length,
          caption: ownLeaves.length ? 'Your leave requests in the system' : 'No leave requests yet',
          icon: 'pi-calendar',
          accent: 'amber',
          action: () => navigate(myLeavesRoute),
          actionLabel: 'View my leaves',
        },
        {
          title: effectiveReportingManager ? 'Assigned Leaves' : 'Visible Leave Activity',
          value: effectiveReportingManager ? managedLeaves.length : ownLeaves.length,
          caption: effectiveReportingManager ? 'Only leave records assigned to you for review' : 'Your leave records only',
          icon: 'pi-briefcase',
          accent: 'rose',
          action: () => navigate(effectiveReportingManager ? approvalsRoute : myLeavesRoute),
          actionLabel: effectiveReportingManager ? 'Open approvals' : 'Open leave activity',
        },
      ]

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="dashboard-eyebrow">Live Workforce Snapshot</span>
          <h2>
            Welcome back, {getUserDisplayName(user)}
          </h2>
          <p>
            {isAdmin
              ? 'Keep an eye on approvals, availability, announcements, and upcoming dates from one place.'
              : effectiveReportingManager
                ? 'Track your own leave activity in My Leaves and review only assigned requests in Approvals.'
                : 'Track your profile, leave requests, and upcoming workplace updates from one place.'}
          </p>
          <div className="dashboard-hero-actions">
            <button
              type="button"
              className="dashboard-cta-primary"
              onClick={() => navigate(isAdmin ? approvalsRoute : myLeavesRoute)}
            >
              {isAdmin ? 'Review Leaves' : 'My Leave Requests'}
            </button>
            <button type="button" className="dashboard-cta-secondary" onClick={() => navigate('/employees')}>
              {isAdmin ? 'Employee Directory' : 'My Profile'}
            </button>
          </div>
        </div>

        <div className="dashboard-hero-panel">
          <div className="dashboard-hero-date">{formatFullDate(today)}</div>
          <div className="dashboard-hero-grid">
            <div>
              <span>Announcements</span>
              <strong>{activeNotifications.length}</strong>
            </div>
            <div>
              <span>Upcoming Holidays</span>
              <strong>{upcomingHolidays.length}</strong>
            </div>
            <div>
              <span>Birthdays Today</span>
              <strong>{birthdaysToday.length}</strong>
            </div>
            <div>
              <span>Work Anniversaries</span>
              <strong>{anniversariesToday.length}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={`dashboard-stat-grid ${!isAdmin ? 'dashboard-stat-grid-user' : ''}`}>
        {dashboardStats.map((item) => (
          <button
            key={item.title}
            type="button"
            className={`dashboard-stat-card dashboard-stat-${item.accent}`}
            onClick={item.action}
          >
            <div className="dashboard-stat-icon">
              <i className={`pi ${item.icon}`} />
            </div>
            <div className="dashboard-stat-content">
              <span>{item.title}</span>
              <strong>{item.value}</strong>
              <small>{item.caption}</small>
            </div>
            <div className="dashboard-stat-link">{item.actionLabel}</div>
          </button>
        ))}
      </section>

      {!isAdmin ? (
        <section className="dashboard-panel dashboard-leave-balance-panel">
          <div className="dashboard-panel-head">
            <div>
              <span className="dashboard-panel-kicker">Leave Overview</span>
              <h3>My Leave Balance</h3>
            </div>
          </div>

          {leaveBalancesLoading || employeesLoading ? (
            <div className="dashboard-empty">Loading leave balances...</div>
          ) : leaveBalanceCards.length ? (
            <div className="dashboard-leave-balance-grid">
              {leaveBalanceCards.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="dashboard-leave-balance-card"
                  onClick={() =>
                    navigate('/my-leaves', {
                      state: {
                        openApplyModal: true,
                        leaveTypeId: String(item.id),
                      },
                    })
                  }
                >
                  <div className="dashboard-leave-balance-title">{item.name}</div>
                  <div
                    className="dashboard-leave-balance-ring"
                    style={{ '--progress': `${item.progress}%` }}
                  >
                    <div>
                      <span>Remaining Balance</span>
                      <strong>{formatLeaveValue(item.remainingBalance)}</strong>
                    </div>
                  </div>
                  <div className="dashboard-leave-balance-meta">
                    <span>Taken Leaves: {formatLeaveValue(item.takenLeaves)}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">No leave types found in settings.</div>
          )}
        </section>
      ) : null}

      <section className="dashboard-main-grid">
        <article className="dashboard-panel dashboard-panel-wide">
          <div className="dashboard-panel-head">
            <div>
              <h3>Upcoming Leave Requests</h3>
            </div>
            <button type="button" className="dashboard-text-link" onClick={() => navigate('/approvals')}>
              View all
            </button>
          </div>

          {leavesLoading ? (
            <div className="dashboard-empty">Loading leave activity...</div>
          ) : upcomingLeaves.length === 0 ? (
            <div className="dashboard-empty">No upcoming leave requests in the next 7 days.</div>
          ) : (
            <div className="dashboard-request-list">
              {upcomingLeaves.map((leave) => (
                <div key={leave.id} className="dashboard-request-item">
                  <div className="dashboard-request-avatar">{getInitials(leave.employeeName)}</div>
                  <div className="dashboard-request-copy">
                    <strong>{leave.employeeName}</strong>
                    <span>{leave.leaveTypeName}</span>
                  </div>
                  <div className="dashboard-request-dates">
                    {formatFriendlyDateRange(leave.startDate, leave.endDate)}
                  </div>
                  <div className={getStatusClass(leave.status)}>
                    {STATUS_COPY[leave.status] || leave.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel-head">
            <div>
              <span className="dashboard-panel-kicker">Today</span>
              <h3>Who&apos;s On Leave</h3>
            </div>
          </div>

          {leavesLoading ? (
            <div className="dashboard-empty">Checking team availability...</div>
          ) : activeLeaves.length === 0 ? (
            <div className="dashboard-empty">No one is currently on leave.</div>
          ) : (
            <div className="dashboard-stack-list">
              {activeLeaves.map((leave) => (
                <div key={leave.id} className="dashboard-stack-item">
                  <div className="dashboard-stack-avatar">{getInitials(leave.employeeName)}</div>
                  <div>
                    <strong>{leave.employeeName}</strong>
                    <span>{leave.leaveTypeName}</span>
                  </div>
                  <small>{formatFriendlyDateRange(leave.startDate, leave.endDate)}</small>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel-head">
            <div>
              <span className="dashboard-panel-kicker">Broadcasts</span>
              <h3>Announcements</h3>
            </div>
            {isAdmin ? (
              <button
                type="button"
                className="dashboard-text-link"
                onClick={() => navigate('/announcements')}
              >
                Manage
              </button>
            ) : null}
          </div>

          {notificationsLoading ? (
            <div className="dashboard-empty">Loading announcements...</div>
          ) : activeNotifications.length === 0 ? (
            <div className="dashboard-empty">No announcements published yet.</div>
          ) : (
            <div className="dashboard-announcement-carousel">
              <div
                className={`dashboard-announcement-track ${activeNotifications.length > 1 ? 'is-animated' : ''}`}
              >
                {announcementItems.map((item, index) => (
                  <a
                    key={`${item.id}-${index}`}
                    className="dashboard-announcement-item"
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className="dashboard-announcement-icon">
                      <i className="pi pi-megaphone" />
                    </div>
                    <div>
                      <strong>{item.title || 'Announcement'}</strong>
                      <span>{item.url}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </article>

        <article className="dashboard-panel dashboard-panel-wide">
          <div className="dashboard-panel-head">
            <div>
              <span className="dashboard-panel-kicker">Calendar Watch</span>
              <h3>Upcoming Holidays</h3>
            </div>
            {isAdmin ? (
              <button type="button" className="dashboard-text-link" onClick={() => navigate('/settings/holidays')}>
                Manage
              </button>
            ) : null}
          </div>

          {holidaysLoading ? (
            <div className="dashboard-empty">Loading holiday calendar...</div>
          ) : upcomingHolidays.length === 0 ? (
            <div className="dashboard-empty">No upcoming holidays available.</div>
          ) : (
            <div className="dashboard-holiday-grid">
              {upcomingHolidays.map((holiday) => (
                <div key={holiday.id} className="dashboard-holiday-card">
                  <div className="dashboard-holiday-date">
                    <span>{formatShortDate(holiday.normalizedDate).split(' ')[0]}</span>
                    <strong>{formatShortDate(holiday.normalizedDate).split(' ').slice(1).join(' ')}</strong>
                  </div>
                  <div className="dashboard-holiday-copy">
                    <strong>{holiday.name}</strong>
                    <span>{holiday.holidayTypeName}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel-head">
            <div>
              <span className="dashboard-panel-kicker">People Moments</span>
              <h3>Celebrations</h3>
            </div>
          </div>

          {employeesLoading ? (
            <div className="dashboard-empty">Loading celebrations...</div>
          ) : birthdaysToday.length === 0 && anniversariesToday.length === 0 ? (
            <div className="dashboard-empty">No celebrations today.</div>
          ) : (
            <div className="dashboard-celebration-list">
              {birthdaysToday.map((employee) => (
                <div key={`birthday-${employee.id}`} className="dashboard-celebration-item">
                  <div className="dashboard-celebration-pill birthday">Birthday</div>
                  <div>
                    <strong>{getEmployeeName(employee)}</strong>
                    <span>Wishing a wonderful day ahead.</span>
                  </div>
                </div>
              ))}

              {anniversariesToday.map((employee) => (
                <div key={`anniversary-${employee.id}`} className="dashboard-celebration-item">
                  <div className="dashboard-celebration-pill anniversary">Anniversary</div>
                  <div>
                    <strong>{getEmployeeName(employee)}</strong>
                    <span>Celebrating work anniversary today.</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  )
}

export default Dashboard
