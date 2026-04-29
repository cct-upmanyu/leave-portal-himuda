import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useGetEmployeesQuery } from '../redux/api/employeeApi'
import { useGetHolidaysQuery } from '../redux/api/holidayApi'
import { useGetLeavesQuery } from '../redux/api/leaveApi'
import { useGetLeaveTypesQuery } from '../redux/api/leaveTypeApi'
import { useGetLookupsQuery } from '../redux/api/lookupApi'
import { useGetNotificationsQuery } from '../redux/api/notificationApi'
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
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split('-')
    return `${year}-${month}-${day}`
  }
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

const getLocalDateString = (value = new Date()) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getEmployeeName = (employee) => {
  if (!employee) return 'Unknown employee'
  const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(' ').trim()
  return fullName || employee.user_name || employee.email || 'Unknown employee'
}

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

function Dashboard() {
  const navigate = useNavigate()
  const user = useSelector((state) => state.auth.user)

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
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const todayMonthDay = `${today.getMonth() + 1}-${today.getDate()}`

  const employeeMap = new Map(employees.map((employee) => [String(employee.emp_id || employee.id || ''), employee]))
  const holidayTypeMap = new Map(holidayTypes.map((item) => [String(item.id), item.name]))
  const leaveTypeMap = new Map(leaveTypes.map((item) => [String(item.id), item.name]))

  const normalizedLeaves = leaves.map((leave) => {
    const employee = employeeMap.get(String(leave.userId))
    return {
      ...leave,
      employeeName: leave.employeeName || getEmployeeName(employee),
      leaveTypeName: leave.leaveTypeName || leave.leaveType || leaveTypeMap.get(String(leave.leaveTypeId)) || 'Leave',
      status: String(leave.status || 'pending').toLowerCase(),
    }
  })

  const approvedLeaves = normalizedLeaves.filter((leave) => leave.status === 'approved')
  const pendingLeaves = normalizedLeaves.filter((leave) => leave.status === 'pending')
  const activeLeaves = approvedLeaves.filter((leave) => {
    const startDate = normalizeDate(leave.startDate)
    const endDate = normalizeDate(leave.endDate)
    return startDate && endDate && startDate <= todayString && endDate >= todayString
  })

  const recentLeaves = normalizedLeaves
    .slice()
    .sort((a, b) => {
      const left = new Date(b.startDate || b.createdAt || 0).getTime()
      const right = new Date(a.startDate || a.createdAt || 0).getTime()
      return left - right
    })
    .slice(0, 5)

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

  const dashboardStats = [
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

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="dashboard-eyebrow">Live Workforce Snapshot</span>
          <h2>
            Welcome back, {user?.username || user?.email?.split('@')[0] || 'Team Member'}
          </h2>
          <p>
            Keep an eye on approvals, availability, announcements, and upcoming dates from one
            place.
          </p>
          <div className="dashboard-hero-actions">
            <button type="button" className="dashboard-cta-primary" onClick={() => navigate('/approvals')}>
              Review Approvals
            </button>
            <button type="button" className="dashboard-cta-secondary" onClick={() => navigate('/employees')}>
              Employee Directory
            </button>
          </div>
        </div>

        <div className="dashboard-hero-panel">
          <div className="dashboard-hero-date">{formatFullDate(today)}</div>
          <div className="dashboard-hero-grid">
            <div>
              <span>Announcements</span>
              <strong>{notifications.length}</strong>
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

      <section className="dashboard-stat-grid">
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

      <section className="dashboard-main-grid">
        <article className="dashboard-panel dashboard-panel-wide">
          <div className="dashboard-panel-head">
            <div>
              <span className="dashboard-panel-kicker">Operational Pulse</span>
              <h3>Recent Leave Requests</h3>
            </div>
            <button type="button" className="dashboard-text-link" onClick={() => navigate('/approvals')}>
              View all
            </button>
          </div>

          {leavesLoading ? (
            <div className="dashboard-empty">Loading leave activity...</div>
          ) : recentLeaves.length === 0 ? (
            <div className="dashboard-empty">No leave requests available yet.</div>
          ) : (
            <div className="dashboard-request-list">
              {recentLeaves.map((leave) => (
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
            <button
              type="button"
              className="dashboard-text-link"
              onClick={() => navigate('/settings/announcements')}
            >
              Manage
            </button>
          </div>

          {notificationsLoading ? (
            <div className="dashboard-empty">Loading announcements...</div>
          ) : notifications.length === 0 ? (
            <div className="dashboard-empty">No announcements published yet.</div>
          ) : (
            <div className="dashboard-announcement-list">
              {notifications.slice(0, 4).map((item) => (
                <a
                  key={item.id}
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
          )}
        </article>

        <article className="dashboard-panel dashboard-panel-wide">
          <div className="dashboard-panel-head">
            <div>
              <span className="dashboard-panel-kicker">Calendar Watch</span>
              <h3>Upcoming Holidays</h3>
            </div>
            <button type="button" className="dashboard-text-link" onClick={() => navigate('/settings/holidays')}>
              Manage
            </button>
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
