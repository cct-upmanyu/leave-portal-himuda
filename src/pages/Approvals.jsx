import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  useCreateLeaveMutation,
  useGetLeavesQuery,
  useUpdateLeaveMutation,
} from '../redux/api/leaveApi'
import { useGetEmployeesQuery, useGetManagersQuery, useUpdateEmployeeMutation } from '../redux/api/employeeApi'
import { useGetLeaveTypesQuery } from '../redux/api/leaveTypeApi'
import { isAdminUser } from '../utils/access'
import { toastService } from '../utils/toastService'
import '../styles/Approvals.css'

const getTodayString = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const TODAY = getTodayString()

const emptyForm = {
  employeeId: '',
  leaveTypeId: '',
  startDate: '',
  endDate: '',
  halfLeave: false,
  halfLeaveDate: '',
  shortLeave: false,
  shortLeaveDate: '',
  reason: '',
  outOfStation: false,
  leaveDateTime: '',
  returnDateTime: '',
  absenceAddress: '',
}

const formatDate = (value) => {
  if (!value) return '-'
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getEmployeeName = (employee) => {
  if (!employee) return ''
  const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(' ').trim()
  return fullName || employee.user_name || employee.email || `Employee ${employee.id || employee.emp_id || ''}`.trim()
}

const getEmployeeUserId = (employee) => String(employee?.emp_id || employee?.id || '')

const formatEmployeeCode = (employee) => employee?.emp_id || employee?.id || '-'

const getInitials = (value) =>
  String(value || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'NA'

const getLeaveDateOptions = (startDate, endDate) => {
  const values = [startDate, endDate].filter(Boolean)
  return [...new Set(values)]
}

const getDaysLabel = ({ startDate, endDate, halfLeave, shortLeave, halfLeaveDate, shortLeaveDate }) => {
  if (!startDate || !endDate) return { value: 0, label: '0 Day' }

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { value: 0, label: '0 Day' }
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000
  const totalDays = Math.max(1, Math.round((end - start) / millisecondsPerDay) + 1)
  const selectedPartialDate = shortLeave ? shortLeaveDate : halfLeave ? halfLeaveDate : ''
  const canReduce = Boolean(selectedPartialDate && selectedPartialDate >= startDate && selectedPartialDate <= endDate)
  const value = canReduce ? Math.max(0.5, totalDays - 0.5) : totalDays

  return {
    value,
    label: `${value} Day${value === 1 ? '' : 's'}`,
  }
}

const statusLabel = (status) => {
  const normalized = String(status || 'pending').toLowerCase()
  if (normalized === 'cancelled') return 'Cancelled'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

const sortLeavesByStartDate = (records) =>
  [...records].sort((left, right) => String(right.startDate || '').localeCompare(String(left.startDate || '')))

function Approvals() {
  const user = useSelector((state) => state.auth.user)
  const isAdmin = isAdminUser(user)
  const { data: leaveResponse, isLoading: isLeavesLoading } = useGetLeavesQuery()
  const { data: employeeResponse } = useGetEmployeesQuery()
  const { data: managersResponse } = useGetManagersQuery(undefined, { skip: !isAdmin })
  const { data: leaveTypeResponse } = useGetLeaveTypesQuery()
  const [createLeave, { isLoading: isCreating }] = useCreateLeaveMutation()
  const [updateLeave, { isLoading: isUpdating }] = useUpdateLeaveMutation()
  const [updateEmployee, { isLoading: isAssigningManager }] = useUpdateEmployeeMutation()

  const leaves = leaveResponse?.data || []
  const employees = employeeResponse?.data || []
  const managers = managersResponse?.data || []
  const leaveTypes = leaveTypeResponse?.data || []

  const employeeMap = useMemo(
    () => new Map(employees.map((employee) => [getEmployeeUserId(employee), employee])),
    [employees],
  )

  const leaveTypeMap = useMemo(
    () => new Map(leaveTypes.map((type) => [String(type.id), type])),
    [leaveTypes],
  )

  const normalizedLeaves = useMemo(
    () =>
      leaves.map((leave) => {
        const employee = employeeMap.get(String(leave.userId))
        const leaveType = leaveTypeMap.get(String(leave.leaveTypeId))
        return {
          ...leave,
          employeeName: leave.employeeName || getEmployeeName(employee),
          leaveTypeName: leave.leaveTypeName || leave.leaveType || leaveType?.name || '-',
        }
      }),
    [employeeMap, leaveTypeMap, leaves],
  )

  const leaveHistoryByEmployee = useMemo(() => {
    const grouped = new Map()

    normalizedLeaves.forEach((leave) => {
      const key = String(leave.userId || '')
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key).push(leave)
    })

    grouped.forEach((records, key) => {
      grouped.set(key, sortLeavesByStartDate(records))
    })

    return grouped
  }, [normalizedLeaves])

  const [isApplyOpen, setIsApplyOpen] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [selectedLeave, setSelectedLeave] = useState(null)
  const [assignManagerLeave, setAssignManagerLeave] = useState(null)
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [form, setForm] = useState(emptyForm)

  const leaveDateOptions = useMemo(
    () => getLeaveDateOptions(form.startDate, form.endDate),
    [form.endDate, form.startDate],
  )

  const endDateMin = form.startDate || ''
  const isDateRangeReady = Boolean(form.startDate && form.endDate)
  const duration = getDaysLabel(form)

  useEffect(() => {
    if (!form.employeeId && employees.length) {
      setForm((current) => ({
        ...current,
        employeeId: getEmployeeUserId(employees[0]),
      }))
    }
  }, [employees, form.employeeId])

  useEffect(() => {
    if (!form.leaveTypeId && leaveTypes.length) {
      setForm((current) => ({
        ...current,
        leaveTypeId: String(leaveTypes[0].id || ''),
      }))
    }
  }, [form.leaveTypeId, leaveTypes])

  useEffect(() => {
    setForm((current) => {
      let next = current
      let changed = false

      if (current.endDate && current.startDate && current.endDate < current.startDate) {
        next = { ...next, endDate: current.startDate }
        changed = true
      }

      const validOptions = getLeaveDateOptions(next.startDate, next.endDate)

      if (next.halfLeave && !validOptions.includes(next.halfLeaveDate)) {
        next = { ...next, halfLeaveDate: validOptions[0] || '' }
        changed = true
      }

      if (next.shortLeave && !validOptions.includes(next.shortLeaveDate)) {
        next = { ...next, shortLeaveDate: validOptions[0] || '' }
        changed = true
      }

      if ((!next.startDate || !next.endDate) && (next.halfLeave || next.shortLeave)) {
        next = {
          ...next,
          halfLeave: false,
          shortLeave: false,
          halfLeaveDate: '',
          shortLeaveDate: '',
        }
        changed = true
      }

      return changed ? next : current
    })
  }, [form.endDate, form.startDate])

  useEffect(() => {
    const handleCloseMenu = () => setActiveMenuId(null)
    window.addEventListener('click', handleCloseMenu)
    return () => window.removeEventListener('click', handleCloseMenu)
  }, [])

  useEffect(() => {
    if (!selectedLeave) return
    const latestLeave = normalizedLeaves.find((leave) => leave.id === selectedLeave.id)
    if (latestLeave) {
      setSelectedLeave(latestLeave)
    }
  }, [normalizedLeaves, selectedLeave])

  const handleMenuToggle = (event, id) => {
    event.stopPropagation()
    setActiveMenuId((current) => (current === id ? null : id))
  }

  const openLeaveDetails = (leave) => {
    setSelectedLeave(leave)
    setActiveMenuId(null)
  }

  const canManageLeave = (leave) =>
    isAdmin || (String(leave?.reportingManagerId || '') === String(user?.rowid || '') && String(leave?.userId || '') !== String(user?.rowid || ''))

  const openAssignManagerModal = (leave) => {
    setAssignManagerLeave(leave)
    setSelectedManagerId(String(leave?.reportingManagerId || ''))
    setActiveMenuId(null)
  }

  const handleStatusUpdate = async (leave, status) => {
    const nextStatus = status === 'rejected' ? 'cancelled' : status
    await updateLeave({ id: leave.id, status: nextStatus }).unwrap()
    setActiveMenuId(null)
    if (selectedLeave?.id === leave.id) {
      setSelectedLeave({ ...selectedLeave, status: nextStatus })
    }
  }

  const handleAssignManager = async (event) => {
    event.preventDefault()
    const employeeRecord = employees.find((employee) => String(employee.emp_id || employee.id || '') === String(assignManagerLeave?.userId || ''))
    const employeeId = employeeRecord?.id || assignManagerLeave?.employeeDetailId

    if (!employeeId || !selectedManagerId) {
      toastService.show({
        severity: 'warn',
        summary: 'Selection required',
        detail: 'Please choose a reporting manager first.',
        life: 2500,
      })
      return
    }

    await updateEmployee({ id: employeeId, reporting_manager: selectedManagerId }).unwrap()
    setAssignManagerLeave(null)
    setSelectedManagerId('')
  }

  const handleCheckboxSelection = (name, checked) => {
    if (checked && !isDateRangeReady) {
      toastService.show({
        severity: 'warn',
        summary: 'Dates required',
        detail: 'Please select start date and end date first.',
        life: 2500,
      })
      return
    }

    setForm((current) => {
      const options = getLeaveDateOptions(current.startDate, current.endDate)
      const firstOption = options[0] || ''
      const next = { ...current, [name]: checked }

      if (name === 'halfLeave') {
        next.shortLeave = false
        next.shortLeaveDate = ''
        next.halfLeaveDate = checked ? current.halfLeaveDate || firstOption : ''
      }

      if (name === 'shortLeave') {
        next.halfLeave = false
        next.halfLeaveDate = ''
        next.shortLeaveDate = checked ? current.shortLeaveDate || firstOption : ''
      }

      return next
    })
  }

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target

    if (name === 'halfLeave' || name === 'shortLeave') {
      handleCheckboxSelection(name, checked)
      return
    }

    const nextValue = type === 'checkbox' ? checked : value

    setForm((current) => {
      const next = { ...current, [name]: nextValue }

      if (name === 'outOfStation' && !checked) {
        next.leaveDateTime = ''
        next.returnDateTime = ''
        next.absenceAddress = ''
      }

      if (name === 'startDate') {
        if (!current.endDate || current.endDate < value) {
          next.endDate = value
        }
      }

      if (name === 'endDate' && current.startDate && value < current.startDate) {
        next.endDate = current.startDate
      }

      return next
    })
  }

  const openApplyModal = () => {
    setForm((current) => ({
      ...emptyForm,
      employeeId: current.employeeId || getEmployeeUserId(employees[0]),
      leaveTypeId: current.leaveTypeId || String(leaveTypes[0]?.id || ''),
    }))
    setIsApplyOpen(true)
  }

  const closeApplyModal = () => setIsApplyOpen(false)

  const handleApplySubmit = async (event) => {
    event.preventDefault()
    const employee =
      employees.find((item) => getEmployeeUserId(item) === String(form.employeeId)) || null

    await createLeave({
      userId: form.employeeId,
      leaveTypeId: form.leaveTypeId,
      reportingManagerId: employee?.reporting_manager || null,
      startDate: form.startDate,
      endDate: form.endDate,
      halfLeave: form.halfLeave,
      halfLeaveDate: form.halfLeave ? form.halfLeaveDate : '',
      shortLeave: form.shortLeave,
      shortLeaveDate: form.shortLeave ? form.shortLeaveDate : '',
      reason: form.reason,
      leaveStation: form.outOfStation ? 'yes' : 'no',
      dateTimeLeave: form.outOfStation ? form.leaveDateTime : '',
      dateTimeReturn: form.outOfStation ? form.returnDateTime : '',
      addressDuringLeave: form.outOfStation ? form.absenceAddress : '',
      email: employee?.email || '',
      mobileNumber: employee?.mobile || '',
      emergencyContactName: employee?.emergency_contact_name || '',
      emergencyContactNumber: employee?.emergency_contact_number || '',
      days: duration.value,
      status: 'pending',
    }).unwrap()

    setIsApplyOpen(false)
    setForm({
      ...emptyForm,
      employeeId: form.employeeId,
      leaveTypeId: form.leaveTypeId,
    })
  }

  const selectedEmployee = selectedLeave
    ? employeeMap.get(String(selectedLeave.userId)) || {
        id: selectedLeave.employeeDetailId || null,
        emp_id: selectedLeave.userId || null,
        email: selectedLeave.email || null,
        mobile: selectedLeave.mobileNumber || null,
        emergency_contact_name: selectedLeave.emergencyContactName || null,
        emergency_contact_number: selectedLeave.emergencyContactNumber || null,
        date_of_joining: selectedLeave.employeeDateOfJoining || null,
        reporting_manager: selectedLeave.reportingManagerId || null,
      }
    : null
  const selectedEmployeeHistory = selectedLeave
    ? leaveHistoryByEmployee.get(String(selectedLeave.userId)) || []
    : []
  const selectedEmployeeApprovedCount = selectedEmployeeHistory.filter((leave) => leave.status === 'approved').length
  const selectedEmployeePendingCount = selectedEmployeeHistory.filter((leave) => leave.status === 'pending').length
  const selectedEmployeeCancelledCount = selectedEmployeeHistory.filter((leave) => leave.status === 'cancelled').length

  return (
    <div className="approvals-page">
      <section className="approvals-card">
        <div className="approvals-header">
          <div>
            <h2>Approvals</h2>
            <p>Review leave requests, inspect details, and take action from one place.</p>
          </div>
          <button type="button" className="approvals-primary-btn" onClick={openApplyModal}>
            Apply Leave
          </button>
        </div>

        <div className="approvals-table-wrap">
          <table className="approvals-table">
            <thead>
              <tr>
                <th>Leave Type</th>
                <th>Name</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Status</th>
                <th>Reason</th>
                <th className="approvals-action-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLeavesLoading ? (
                <tr>
                  <td colSpan="8" className="approvals-empty">
                    Loading leave requests...
                  </td>
                </tr>
              ) : normalizedLeaves.length === 0 ? (
                <tr>
                  <td colSpan="8" className="approvals-empty">
                    No leave requests available yet.
                  </td>
                </tr>
              ) : (
                normalizedLeaves.map((leave) => (
                  <tr
                    key={leave.id}
                    className="approval-row"
                    onClick={() => openLeaveDetails(leave)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openLeaveDetails(leave)
                      }
                    }}
                    tabIndex={0}
                  >
                    <td>{leave.leaveTypeName}</td>
                    <td>{leave.employeeName || '-'}</td>
                    <td>{formatDate(leave.startDate)}</td>
                    <td>{formatDate(leave.endDate)}</td>
                    <td>{leave.daysDisplay || `${leave.days} Days`}</td>
                    <td>
                      <span className={`approval-status approval-status-${leave.status || 'pending'}`}>
                        {statusLabel(leave.status)}
                      </span>
                    </td>
                    <td className="approval-reason-cell">{leave.reason || '-'}</td>
                    <td className="approvals-action-cell">
                      <div className="approval-menu-wrap">
                        <button
                          type="button"
                          className="approval-menu-trigger"
                          onClick={(event) => handleMenuToggle(event, leave.id)}
                          aria-label={`Open actions for ${leave.employeeName || 'leave request'}`}
                        >
                          <span />
                          <span />
                          <span />
                        </button>
                        {activeMenuId === leave.id ? (
                          <div className="approval-menu" onClick={(event) => event.stopPropagation()}>
                            <button type="button" onClick={() => openLeaveDetails(leave)}>
                              View
                            </button>
                            {isAdmin ? (
                              <button type="button" onClick={() => openAssignManagerModal(leave)}>
                                Assign Reporting Manager
                              </button>
                            ) : null}
                            {canManageLeave(leave) ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStatusUpdate(leave, 'approved')}
                                  disabled={isUpdating}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusUpdate(leave, 'rejected')}
                                  disabled={isUpdating}
                                >
                                  Reject
                                </button>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedLeave ? (
        <div className="approval-overlay" onClick={() => setSelectedLeave(null)}>
          <div className="approval-modal approval-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="approval-modal-head">
              <div>
                <h3>Employee Leave Details</h3>
                <p>Approval record, employee profile, and leave summary in one view.</p>
              </div>
              <button type="button" className="approval-close-btn" onClick={() => setSelectedLeave(null)}>
                x
              </button>
            </div>

            <div className="approval-detail-hero">
              <div className="approval-employee-spotlight">
                <div className="approval-employee-avatar">{getInitials(selectedLeave.employeeName)}</div>
                <div className="approval-employee-copy">
                  <span className="approval-eyebrow">Employee profile</span>
                  <h4>{selectedLeave.employeeName || '-'}</h4>
                  <p>
                    Code {formatEmployeeCode(selectedEmployee)} • Joined {formatDate(selectedEmployee?.date_of_joining)}
                  </p>
                </div>
              </div>
              <div className="approval-hero-status">
                <span className={`approval-status approval-status-${selectedLeave.status || 'pending'}`}>
                  {statusLabel(selectedLeave.status)}
                </span>
                <strong>{selectedLeave.leaveTypeName}</strong>
                <small>
                  {formatDate(selectedLeave.startDate)} to {formatDate(selectedLeave.endDate)}
                </small>
              </div>
            </div>

            <div className="approval-summary-strip">
              <div>
                <span>Total Leaves</span>
                <strong>{selectedEmployeeHistory.length}</strong>
              </div>
              <div>
                <span>Approved</span>
                <strong>{selectedEmployeeApprovedCount}</strong>
              </div>
              <div>
                <span>Pending</span>
                <strong>{selectedEmployeePendingCount}</strong>
              </div>
              <div>
                <span>Cancelled</span>
                <strong>{selectedEmployeeCancelledCount}</strong>
              </div>
            </div>

            <div className="approval-detail-layout">
              <div className="approval-detail-main">
                <div className="approval-detail-section">
                  <div className="approval-section-head">
                    <h4>Selected Leave Request</h4>
                    <p>Current request details with the same approve and reject workflow.</p>
                  </div>
                  <div className="approval-detail-grid approval-detail-grid-featured">
                    <div>
                      <span>Leave Type</span>
                      <strong>{selectedLeave.leaveTypeName}</strong>
                    </div>
                    <div>
                      <span>Days</span>
                      <strong>{selectedLeave.daysDisplay || selectedLeave.days}</strong>
                    </div>
                    <div>
                      <span>From</span>
                      <strong>{formatDate(selectedLeave.startDate)}</strong>
                    </div>
                    <div>
                      <span>To</span>
                      <strong>{formatDate(selectedLeave.endDate)}</strong>
                    </div>
                    <div>
                      <span>Half / Short</span>
                      <strong>
                        {selectedLeave.shortLeave
                          ? `Short Leave (${formatDate(selectedLeave.shortLeaveDate)})`
                          : selectedLeave.halfLeave
                            ? `Half Leave (${formatDate(selectedLeave.halfLeaveDate)})`
                            : 'Full Leave'}
                      </strong>
                    </div>
                    <div>
                      <span>Out of Station</span>
                      <strong>{selectedLeave.leaveStation === 'yes' ? 'Yes' : 'No'}</strong>
                    </div>
                    <div className="approval-detail-wide">
                      <span>Reason</span>
                      <strong>{selectedLeave.reason || '-'}</strong>
                    </div>
                    {selectedLeave.leaveStation === 'yes' ? (
                      <>
                        <div>
                          <span>Date &amp; Time (Leave)</span>
                          <strong>{formatDateTime(selectedLeave.dateTimeLeave)}</strong>
                        </div>
                        <div>
                          <span>Date &amp; Time (Return)</span>
                          <strong>{formatDateTime(selectedLeave.dateTimeReturn)}</strong>
                        </div>
                        <div className="approval-detail-wide">
                          <span>Address during absence</span>
                          <strong>{selectedLeave.addressDuringLeave || '-'}</strong>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="approval-detail-section">
                  <div className="approval-section-head">
                    <h4>All Leave Details</h4>
                    <p>Recent leave history for this employee.</p>
                  </div>
                  {selectedEmployeeHistory.length ? (
                    <div className="approval-history-wrap">
                      <table className="approval-history-table">
                        <thead>
                          <tr>
                            <th>Leave Type</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Days</th>
                            <th>Status</th>
                            <th>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedEmployeeHistory.map((leave) => (
                            <tr key={`history-${leave.id}`} className={leave.id === selectedLeave.id ? 'is-active' : ''}>
                              <td>{leave.leaveTypeName}</td>
                              <td>{formatDate(leave.startDate)}</td>
                              <td>{formatDate(leave.endDate)}</td>
                              <td>{leave.daysDisplay || leave.days || '-'}</td>
                              <td>
                                <span className={`approval-status approval-status-${leave.status || 'pending'}`}>
                                  {statusLabel(leave.status)}
                                </span>
                              </td>
                              <td>{leave.reason || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="approvals-empty approval-inline-empty">No leave history found for this employee.</div>
                  )}
                </div>
              </div>
              <aside className="approval-detail-side">
                <div className="approval-detail-section approval-detail-panel">
                  <div className="approval-section-head">
                    <h4>Employee Information</h4>
                    <p>Attached details from the employee record.</p>
                  </div>
                  <div className="approval-detail-stack">
                    <div>
                      <span>Employee Code</span>
                      <strong>{formatEmployeeCode(selectedEmployee)}</strong>
                    </div>
                    <div>
                      <span>Email</span>
                      <strong>{selectedEmployee?.email || selectedLeave.email || '-'}</strong>
                    </div>
                    <div>
                      <span>Mobile Number</span>
                      <strong>{selectedEmployee?.mobile || selectedLeave.mobileNumber || '-'}</strong>
                    </div>
                    <div>
                      <span>Date of Joining</span>
                      <strong>{formatDate(selectedEmployee?.date_of_joining)}</strong>
                    </div>
                    <div>
                      <span>Reporting Manager</span>
                      <strong>{selectedEmployee?.reporting_manager || selectedLeave.reportingManagerId || '-'}</strong>
                    </div>
                  </div>
                </div>

                <div className="approval-detail-section approval-detail-panel">
                  <div className="approval-section-head">
                    <h4>Contact During Leave</h4>
                    <p>Useful details for follow-up while the employee is away.</p>
                  </div>
                  <div className="approval-detail-stack">
                    <div>
                      <span>Emergency Contact</span>
                      <strong>{selectedLeave.emergencyContactName || selectedEmployee?.emergency_contact_name || '-'}</strong>
                    </div>
                    <div>
                      <span>Emergency Number</span>
                      <strong>{selectedLeave.emergencyContactNumber || selectedEmployee?.emergency_contact_number || '-'}</strong>
                    </div>
                    <div>
                      <span>Leave Station</span>
                      <strong>{selectedLeave.leaveStation === 'yes' ? 'Out of station' : 'Within station'}</strong>
                    </div>
                    {selectedLeave.leaveStation === 'yes' ? (
                      <>
                        <div>
                          <span>Date &amp; Time (Leave)</span>
                          <strong>{formatDateTime(selectedLeave.dateTimeLeave)}</strong>
                        </div>
                        <div>
                          <span>Date &amp; Time (Return)</span>
                          <strong>{formatDateTime(selectedLeave.dateTimeReturn)}</strong>
                        </div>
                        <div>
                          <span>Address During Leave</span>
                          <strong>{selectedLeave.addressDuringLeave || '-'}</strong>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </aside>
            </div>

            <div className="approval-modal-actions">
              <button type="button" className="approval-secondary-btn" onClick={() => setSelectedLeave(null)}>
                Close
              </button>
              {canManageLeave(selectedLeave) ? (
                <>
                  <button
                    type="button"
                    className="approval-approve-btn"
                    onClick={() => handleStatusUpdate(selectedLeave, 'approved')}
                    disabled={isUpdating}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="approval-reject-btn"
                    onClick={() => handleStatusUpdate(selectedLeave, 'rejected')}
                    disabled={isUpdating}
                  >
                    Reject
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {assignManagerLeave ? (
        <div className="approval-overlay" onClick={() => setAssignManagerLeave(null)}>
          <div className="approval-modal" onClick={(event) => event.stopPropagation()}>
            <div className="approval-modal-head">
              <div>
                <h3>Assign Reporting Manager</h3>
                <p>{assignManagerLeave.employeeName || '-'}</p>
              </div>
              <button type="button" className="approval-close-btn" onClick={() => setAssignManagerLeave(null)}>
                x
              </button>
            </div>

            <form className="approval-form" onSubmit={handleAssignManager}>
              <label>
                <span>Reporting Manager</span>
                <select
                  name="reportingManager"
                  value={selectedManagerId}
                  onChange={(event) => setSelectedManagerId(event.target.value)}
                  required
                >
                  <option value="">Select reporting manager</option>
                  {managers
                    .filter((manager) => String(manager.id || '') !== String(assignManagerLeave.userId || ''))
                    .map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {[manager.first_name, manager.last_name].filter(Boolean).join(' ').trim() ||
                          manager.user_name ||
                          manager.email}
                      </option>
                    ))}
                </select>
              </label>

              <div className="approval-modal-actions">
                <button type="button" className="approval-secondary-btn" onClick={() => setAssignManagerLeave(null)}>
                  Cancel
                </button>
                <button type="submit" className="approvals-primary-btn" disabled={isAssigningManager}>
                  {isAssigningManager ? 'Assigning...' : 'Assign Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isApplyOpen ? (
        <div className="approval-overlay" onClick={closeApplyModal}>
          <div className="approval-modal approval-form-modal" onClick={(event) => event.stopPropagation()}>
            <div className="approval-modal-head">
              <div>
                <h3>Apply Leave</h3>
                <p>Create a new leave request using the same approval workflow.</p>
              </div>
              <button type="button" className="approval-close-btn" onClick={closeApplyModal}>
                x
              </button>
            </div>

            <form className="approval-form" onSubmit={handleApplySubmit}>
              <div className="approval-form-grid approval-form-grid-top">
                <label>
                  <span>Employee</span>
                  <select name="employeeId" value={form.employeeId} onChange={handleFormChange} required>
                    {employees.map((employee) => (
                      <option key={getEmployeeUserId(employee)} value={getEmployeeUserId(employee)}>
                        {getEmployeeName(employee)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Leave Type</span>
                  <select name="leaveTypeId" value={form.leaveTypeId} onChange={handleFormChange} required>
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Start Date</span>
                  <input
                    type="date"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label>
                  <span>End Date</span>
                  <input
                    type="date"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleFormChange}
                    min={endDateMin}
                    required
                  />
                </label>
              </div>

              <div className="approval-date-note">
                You can select any leave dates. End date starts from the selected start date.
              </div>

              <div className="approval-toggle-row">
                <label className={`approval-check ${!isDateRangeReady ? 'approval-check-disabled' : ''}`}>
                  <input
                    type="checkbox"
                    name="halfLeave"
                    checked={form.halfLeave}
                    onChange={handleFormChange}
                    disabled={!isDateRangeReady}
                  />
                  <span>Half Leave</span>
                </label>

                <label>
                  <span>Half Leave Date</span>
                  <select
                    name="halfLeaveDate"
                    value={form.halfLeaveDate}
                    onChange={handleFormChange}
                    disabled={!form.halfLeave}
                    required={form.halfLeave}
                  >
                    <option value="">Select date</option>
                    {leaveDateOptions.map((dateValue) => (
                      <option key={`half-${dateValue}`} value={dateValue}>
                        {formatDate(dateValue)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={`approval-check ${!isDateRangeReady ? 'approval-check-disabled' : ''}`}>
                  <input
                    type="checkbox"
                    name="shortLeave"
                    checked={form.shortLeave}
                    onChange={handleFormChange}
                    disabled={!isDateRangeReady}
                  />
                  <span>Short Leave</span>
                </label>

                <label>
                  <span>Short Leave Date</span>
                  <select
                    name="shortLeaveDate"
                    value={form.shortLeaveDate}
                    onChange={handleFormChange}
                    disabled={!form.shortLeave}
                    required={form.shortLeave}
                  >
                    <option value="">Select date</option>
                    {leaveDateOptions.map((dateValue) => (
                      <option key={`short-${dateValue}`} value={dateValue}>
                        {formatDate(dateValue)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="approval-full-row">
                <span>Reason For Leave</span>
                <textarea
                  name="reason"
                  value={form.reason}
                  onChange={handleFormChange}
                  rows="4"
                  placeholder="Enter reason"
                  required
                />
              </label>

              <div className="approval-form-grid approval-outstation-grid">
                <label>
                  <span>If you intend to proceed out of station?</span>
                  <select
                    name="outOfStation"
                    value={form.outOfStation ? 'yes' : 'no'}
                    onChange={(event) =>
                      handleFormChange({
                        target: {
                          name: 'outOfStation',
                          type: 'checkbox',
                          checked: event.target.value === 'yes',
                        },
                      })
                    }
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>
                <div className="approval-days-preview">
                  <span>Calculated Duration</span>
                  <strong>{duration.label}</strong>
                </div>
              </div>

              {form.outOfStation ? (
                <>
                  <div className="approval-form-grid">
                    <label>
                      <span>Date &amp; Time (Leave)</span>
                      <input
                        type="datetime-local"
                        name="leaveDateTime"
                        value={form.leaveDateTime}
                        onChange={handleFormChange}
                        required={form.outOfStation}
                      />
                    </label>
                    <label>
                      <span>Date &amp; Time (Return)</span>
                      <input
                        type="datetime-local"
                        name="returnDateTime"
                        value={form.returnDateTime}
                        onChange={handleFormChange}
                        required={form.outOfStation}
                      />
                    </label>
                  </div>

                  <label className="approval-full-row">
                    <span>Address during absence from the station</span>
                    <textarea
                      name="absenceAddress"
                      value={form.absenceAddress}
                      onChange={handleFormChange}
                      rows="3"
                      placeholder="Enter address"
                      required={form.outOfStation}
                    />
                  </label>
                </>
              ) : null}

              <div className="approval-modal-actions">
                <button type="button" className="approval-secondary-btn" onClick={closeApplyModal}>
                  Cancel
                </button>
                <button type="submit" className="approvals-primary-btn" disabled={isCreating}>
                  {isCreating ? 'Applying...' : 'Apply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default Approvals
