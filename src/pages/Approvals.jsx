import { useEffect, useMemo, useState } from 'react'
import {
  useCreateLeaveMutation,
  useGetLeavesQuery,
  useUpdateLeaveMutation,
} from '../redux/api/leaveApi'
import { useGetEmployeesQuery } from '../redux/api/employeeApi'
import { useGetLeaveTypesQuery } from '../redux/api/leaveTypeApi'
import { toastService } from '../utils/toastService'
import '../styles/Approvals.css'

const getTodayString = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getMonthBoundary = (type) => {
  const today = new Date()
  const year = today.getFullYear()
  const monthIndex = today.getMonth()
  const date =
    type === 'start'
      ? new Date(year, monthIndex, 1)
      : new Date(year, monthIndex + 1, 0)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const CURRENT_MONTH_START = getMonthBoundary('start')
const CURRENT_MONTH_END = getMonthBoundary('end')
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

function Approvals() {
  const { data: leaveResponse, isLoading: isLeavesLoading } = useGetLeavesQuery()
  const { data: employeeResponse } = useGetEmployeesQuery()
  const { data: leaveTypeResponse } = useGetLeaveTypesQuery()
  const [createLeave, { isLoading: isCreating }] = useCreateLeaveMutation()
  const [updateLeave, { isLoading: isUpdating }] = useUpdateLeaveMutation()

  const leaves = leaveResponse?.data || []
  const employees = employeeResponse?.data || []
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

  const [isApplyOpen, setIsApplyOpen] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [selectedLeave, setSelectedLeave] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const leaveDateOptions = useMemo(
    () => getLeaveDateOptions(form.startDate, form.endDate),
    [form.endDate, form.startDate],
  )

  const endDateMin = form.startDate || TODAY
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

      if (!current.startDate && current.endDate && current.endDate < TODAY) {
        next = { ...next, endDate: TODAY }
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

  const handleMenuToggle = (event, id) => {
    event.stopPropagation()
    setActiveMenuId((current) => (current === id ? null : id))
  }

  const handleStatusUpdate = async (leave, status) => {
    const nextStatus = status === 'rejected' ? 'cancelled' : status
    await updateLeave({ id: leave.id, status: nextStatus }).unwrap()
    setActiveMenuId(null)
    if (selectedLeave?.id === leave.id) {
      setSelectedLeave({ ...selectedLeave, status: nextStatus })
    }
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
      endDate: TODAY,
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
      endDate: TODAY,
    })
  }

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
                  <tr key={leave.id}>
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
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLeave(leave)
                                setActiveMenuId(null)
                              }}
                            >
                              View
                            </button>
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
          <div className="approval-modal" onClick={(event) => event.stopPropagation()}>
            <div className="approval-modal-head">
              <div>
                <h3>Leave Request Details</h3>
                <p>{selectedLeave.employeeName || '-'}</p>
              </div>
              <button type="button" className="approval-close-btn" onClick={() => setSelectedLeave(null)}>
                x
              </button>
            </div>

            <div className="approval-detail-grid">
              <div>
                <span>Leave Type</span>
                <strong>{selectedLeave.leaveTypeName}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{statusLabel(selectedLeave.status)}</strong>
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
                <span>Days</span>
                <strong>{selectedLeave.daysDisplay || selectedLeave.days}</strong>
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
              <div className="approval-detail-wide">
                <span>Reason</span>
                <strong>{selectedLeave.reason || '-'}</strong>
              </div>
              <div className="approval-detail-wide">
                <span>Out of Station</span>
                <strong>{selectedLeave.leaveStation === 'yes' ? 'Yes' : 'No'}</strong>
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

            <div className="approval-modal-actions">
              <button type="button" className="approval-secondary-btn" onClick={() => setSelectedLeave(null)}>
                Close
              </button>
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
            </div>
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
                    min={CURRENT_MONTH_START}
                    max={CURRENT_MONTH_END}
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
                    max={CURRENT_MONTH_END}
                    required
                  />
                </label>
              </div>

              <div className="approval-date-note">
                Start and end dates are limited to the current month. End date starts from the selected start date, or from today if start date is not chosen yet.
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
