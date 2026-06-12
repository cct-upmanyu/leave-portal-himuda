import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  useCreateLeaveMutation,
  useDeleteLeaveMutation,
  useGetLeavesQuery,
  useUpdateLeaveMutation,
} from '../redux/api/leaveApi'
import { useGetEmployeesQuery, useGetManagersQuery } from '../redux/api/employeeApi'
import { useGetLeaveTypesQuery } from '../redux/api/leaveTypeApi'
import { isAdminUser, isReportingManagerUser } from '../utils/access'
import { toastService } from '../utils/toastService'
import ActivityTimeline from '../components/ActivityTimeline'
import PaginationControls from '../components/PaginationControls'
import ConfirmDialog from '../components/ConfirmDialog'
import usePagination from '../utils/usePagination'
import '../styles/Approvals.css'

const IST_TIME_ZONE = 'Asia/Kolkata'

const pad2 = (value) => String(value).padStart(2, '0')

const getDateParts = (value) => {
  if (!value && value !== 0) return null

  if (value instanceof Date) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: IST_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(value)

    const mapped = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    return {
      year: mapped.year,
      month: mapped.month,
      day: mapped.day,
      hour: mapped.hour,
      minute: mapped.minute,
      second: mapped.second,
      hasTime: true,
      isLiteral: false,
    }
  }

  const raw = String(value).trim()
  if (!raw) return null

  const literalMatch = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/,
  )
  if (literalMatch) {
    const [, year, month, day, hour = '00', minute = '00', second = '00'] = literalMatch
    return {
      year,
      month,
      day,
      hour,
      minute,
      second,
      hasTime: Boolean(literalMatch[4]),
      isLiteral: true,
    }
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(parsed)
  const mapped = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    year: mapped.year,
    month: mapped.month,
    day: mapped.day,
    hour: mapped.hour,
    minute: mapped.minute,
    second: mapped.second,
    hasTime: true,
    isLiteral: false,
  }
}

const getDateOnlyValue = (value) => {
  const parts = getDateParts(value)
  if (!parts) return null
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day))
}

const formatDateFromParts = (parts) => {
  if (!parts) return '-'
  const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)))
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIME_ZONE,
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date)
}

const formatTimeFromParts = (parts) => {
  if (!parts?.hasTime) return ''
  const hour24 = Number(parts.hour)
  const minute = pad2(parts.minute)
  const second = pad2(parts.second)
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12
  return `${pad2(hour12)}:${minute}${second === '00' ? '' : `:${second}`} ${period}`
}

const getTodayString = () => {
  const parts = getDateParts(new Date())
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : ''
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
  const parts = getDateParts(value)
  if (!parts) return value
  return formatDateFromParts(parts)
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const parts = getDateParts(value)
  if (!parts) return value
  const dateLabel = formatDateFromParts(parts)
  const timeLabel = formatTimeFromParts(parts)
  return timeLabel ? `${dateLabel}, ${timeLabel}` : dateLabel
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

  const startValue = getDateOnlyValue(startDate)
  const endValue = getDateOnlyValue(endDate)
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue)) {
    return { value: 0, label: '0 Day' }
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000
  const totalDays = Math.max(1, Math.round((endValue - startValue) / millisecondsPerDay) + 1)
  const selectedPartialDate = shortLeave ? shortLeaveDate : halfLeave ? halfLeaveDate : ''
  const canReduce = Boolean(selectedPartialDate && selectedPartialDate >= startDate && selectedPartialDate <= endDate)
  const partialReduction = shortLeave ? 0.75 : 0.5
  const value = canReduce ? Math.max(shortLeave ? 0.25 : 0.5, totalDays - partialReduction) : totalDays

  return {
    value,
    label: `${value} Day${value === 1 ? '' : 's'}`,
  }
}

const getJoiningDate = (employee) => {
  if (!employee?.date_of_joining) return ''
  return String(employee.date_of_joining).slice(0, 10)
}

const statusLabel = (status) => {
  const normalized = String(status || 'pending').toLowerCase()
  if (normalized === 'cancelled') return 'Cancelled'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

const isPendingLeave = (leave) => String(leave?.status || 'pending').toLowerCase() === 'pending'

const sortLeavesByStartDate = (records) =>
  [...records].sort((left, right) => String(right.startDate || '').localeCompare(String(left.startDate || '')))

function Approvals({ mode = 'approvals' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useSelector((state) => state.auth.user)
  const isAdmin = isAdminUser(user)
  const isReportingManager = isReportingManagerUser(user)
  const { data: leaveResponse, isLoading: isLeavesLoading } = useGetLeavesQuery()
  const { data: employeeResponse } = useGetEmployeesQuery()
  const { data: managersResponse } = useGetManagersQuery()
  const { data: leaveTypeResponse } = useGetLeaveTypesQuery()
  const [createLeave, { isLoading: isCreating }] = useCreateLeaveMutation()
  const [updateLeave, { isLoading: isUpdating }] = useUpdateLeaveMutation()
  const [deleteLeave, { isLoading: isDeleting }] = useDeleteLeaveMutation()

  const leaves = leaveResponse?.data || []
  const employees = employeeResponse?.data || []
  const managers = managersResponse?.data || []
  const leaveTypes = leaveTypeResponse?.data || []

  const employeeMap = useMemo(
    () => new Map(employees.map((employee) => [getEmployeeUserId(employee), employee])),
    [employees],
  )

  const managerMap = useMemo(
    () => new Map(managers.map((manager) => [String(manager.id || ''), manager])),
    [managers],
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

  const ownLeaves = useMemo(
    () =>
      sortLeavesByStartDate(
        normalizedLeaves.filter((leave) => String(leave.userId || '') === String(user?.rowid || '')),
      ),
    [normalizedLeaves, user?.rowid],
  )

  const managedLeaves = useMemo(
    () =>
      sortLeavesByStartDate(
        normalizedLeaves.filter(
          (leave) =>
            String(leave.reportingManagerId || '') === String(user?.rowid || '') &&
            String(leave.userId || '') !== String(user?.rowid || ''),
        ),
      ),
    [normalizedLeaves, user?.rowid],
  )

  const isMyLeavesView = !isAdmin && mode === 'my-leaves'
  const isUserApprovalsView = !isAdmin && mode === 'approvals'
  const [searchTerm, setSearchTerm] = useState('')

  const visibleLeaves = useMemo(() => {
    if (isAdmin) return sortLeavesByStartDate(normalizedLeaves)
    if (isMyLeavesView) return ownLeaves
    return managedLeaves
  }, [isAdmin, isMyLeavesView, managedLeaves, normalizedLeaves, ownLeaves])
  const filteredLeaves = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return visibleLeaves

    return visibleLeaves.filter((leave) =>
      [
        leave.leaveTypeName,
        leave.employeeName,
        leave.reason,
        leave.status,
        formatDate(leave.startDate),
        formatDate(leave.endDate),
        leave.daysDisplay || `${leave.days} Days`,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [searchTerm, visibleLeaves])
  const {
    currentPage,
    endItem,
    paginatedItems,
    setCurrentPage,
    startItem,
    totalItems,
    totalPages,
  } = usePagination(filteredLeaves, {
    resetDeps: [mode, isAdmin, user?.rowid, searchTerm],
  })

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
  const [editingLeave, setEditingLeave] = useState(null)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [activeMenuDirection, setActiveMenuDirection] = useState('down')
  const [selectedLeave, setSelectedLeave] = useState(null)
  const [assignManagerLeave, setAssignManagerLeave] = useState(null)
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [rejectingLeave, setRejectingLeave] = useState(null)
  const [rejectionNote, setRejectionNote] = useState('')
  const [deleteConfirmLeave, setDeleteConfirmLeave] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const closeActiveMenu = () => setActiveMenuId(null)
  const assignableManagers = useMemo(() => {
    const employee = employeeMap.get(String(assignManagerLeave?.userId || ''))
    const employeeUserId = getEmployeeUserId(employee) || String(assignManagerLeave?.userId || '')

    return managers.filter((manager) => {
      if (String(manager.role_id || '') === '1') {
        return false
      }

      if (employeeUserId && String(manager.id || '') === employeeUserId) {
        return false
      }

      return true
    })
  }, [assignManagerLeave, employeeMap, managers])

  const leaveDateOptions = useMemo(
    () => getLeaveDateOptions(form.startDate, form.endDate),
    [form.endDate, form.startDate],
  )

  const endDateMin = form.startDate || ''
  const isDateRangeReady = Boolean(form.startDate && form.endDate)
  const duration = getDaysLabel(form)
  const currentUserEmployeeId = useMemo(() => {
    const ownEmployee = employees.find(
      (employee) => String(getEmployeeUserId(employee)) === String(user?.rowid || ''),
    )
    return ownEmployee ? getEmployeeUserId(ownEmployee) : String(user?.rowid || '')
  }, [employees, user?.rowid])

  const pageTitle = isAdmin ? 'Approvals' : isMyLeavesView ? 'My Leaves' : 'Approvals'
  const pageDescription = isAdmin
    ? 'Review leave requests, inspect details, and take action from one place.'
    : isMyLeavesView
      ? 'Track your own leave requests and apply for new leave from one place.'
      : 'Review leave requests assigned to you as reporting manager.'
  const showApplyButton = isAdmin || isMyLeavesView
  const loadingCopy = isMyLeavesView ? 'Loading your leave requests...' : 'Loading leave requests...'
  const emptyCopy = isMyLeavesView
    ? 'No leave requests found for your account yet.'
    : isUserApprovalsView
      ? 'No leave requests are currently assigned to you for approval.'
      : 'No leave requests available yet.'

  useEffect(() => {
    if (!form.employeeId && (isAdmin ? employees.length : currentUserEmployeeId)) {
      setForm((current) => ({
        ...current,
        employeeId: isAdmin ? getEmployeeUserId(employees[0]) : currentUserEmployeeId,
      }))
    }
  }, [currentUserEmployeeId, employees, form.employeeId, isAdmin])

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

  useEffect(() => {
    if (selectedLeave || assignManagerLeave || rejectingLeave || isApplyOpen) {
      closeActiveMenu()
    }
  }, [assignManagerLeave, isApplyOpen, rejectingLeave, selectedLeave])

  const handleMenuToggle = (event, id) => {
    event.stopPropagation()
    const isSameMenu = activeMenuId === id
    if (isSameMenu) {
      setActiveMenuId(null)
      setActiveMenuDirection('down')
      return
    }

    const triggerRect = event.currentTarget.getBoundingClientRect()
    const estimatedMenuHeight = 44 * 5 + 12
    const spaceBelow = window.innerHeight - triggerRect.bottom
    const spaceAbove = triggerRect.top
    const direction = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow ? 'up' : 'down'

    setActiveMenuDirection(direction)
    setActiveMenuId(id)
  }

  const openLeaveDetails = (leave) => {
    setSelectedLeave(leave)
    closeActiveMenu()
  }

  const canEditOwnLeave = (leave) =>
    isPendingLeave(leave) &&
    (isAdmin || String(leave?.userId || '') === String(user?.rowid || ''))

  const canManageLeave = (leave) =>
    isAdmin || (String(leave?.reportingManagerId || '') === String(user?.rowid || '') && String(leave?.userId || '') !== String(user?.rowid || ''))

  const openEditLeaveModal = (leave) => {
    if (!canEditOwnLeave(leave)) return

    setEditingLeave(leave)
    setForm({
      employeeId: String(leave.userId || ''),
      leaveTypeId: String(leave.leaveTypeId || ''),
      startDate: String(leave.startDate || '').slice(0, 10),
      endDate: String(leave.endDate || '').slice(0, 10),
      halfLeave: Boolean(leave.halfLeave),
      halfLeaveDate: leave.halfLeaveDate ? String(leave.halfLeaveDate).slice(0, 10) : '',
      shortLeave: Boolean(leave.shortLeave),
      shortLeaveDate: leave.shortLeaveDate ? String(leave.shortLeaveDate).slice(0, 10) : '',
      reason: leave.reason || '',
      outOfStation: leave.leaveStation === 'yes',
      leaveDateTime: leave.dateTimeLeave || '',
      returnDateTime: leave.dateTimeReturn || '',
      absenceAddress: leave.addressDuringLeave || '',
    })
    setIsApplyOpen(true)
    closeActiveMenu()
  }

  const openAssignManagerModal = (leave) => {
    if (!isPendingLeave(leave)) return
    setAssignManagerLeave(leave)
    setSelectedManagerId(String(leave?.reportingManagerId || ''))
    closeActiveMenu()
  }

  const openRejectModal = (leave) => {
    if (!isPendingLeave(leave)) return
    setRejectingLeave(leave)
    setRejectionNote('')
    closeActiveMenu()
  }

  const closeRejectModal = () => {
    setRejectingLeave(null)
    setRejectionNote('')
  }

  const handleStatusUpdate = async (leave, status) => {
    const nextStatus = status === 'rejected' ? 'cancelled' : status
    await updateLeave({ id: leave.id, status: nextStatus }).unwrap()
    closeActiveMenu()
    if (selectedLeave?.id === leave.id) {
      setSelectedLeave({ ...selectedLeave, status: nextStatus })
    }
  }

  const handleRejectSubmit = async (event) => {
    event.preventDefault()

    const note = rejectionNote.trim()
    if (!note || !rejectingLeave?.id) {
      toastService.show({
        severity: 'warn',
        summary: 'Reason required',
        detail: 'Please enter a rejection reason before continuing.',
        life: 2500,
      })
      return
    }

    await updateLeave({
      id: rejectingLeave.id,
      status: 'cancelled',
      reason: note,
    }).unwrap()

    if (selectedLeave?.id === rejectingLeave.id) {
      setSelectedLeave((current) =>
        current
          ? {
              ...current,
              status: 'cancelled',
              reason: note,
            }
          : current,
      )
    }

    closeRejectModal()
  }

  const handleAssignManager = async (event) => {
    event.preventDefault()

    if (!assignManagerLeave?.id || !selectedManagerId) {
      toastService.show({
        severity: 'warn',
        summary: 'Selection required',
        detail: 'Please choose a reporting manager first.',
        life: 2500,
      })
      return
    }

    await updateLeave({ id: assignManagerLeave.id, reportingManagerId: selectedManagerId }).unwrap()
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
      const employeeForForm =
        name === 'employeeId'
          ? employees.find((item) => getEmployeeUserId(item) === String(value)) || null
          : employees.find((item) => getEmployeeUserId(item) === String(current.employeeId)) || null
      const joiningDate = getJoiningDate(employeeForForm)

      if (name === 'outOfStation' && !checked) {
        next.leaveDateTime = ''
        next.returnDateTime = ''
        next.absenceAddress = ''
      }

      if (name === 'employeeId' && joiningDate) {
        if (next.startDate && next.startDate < joiningDate) {
          next.startDate = joiningDate
        }
        if (next.endDate && next.endDate < joiningDate) {
          next.endDate = joiningDate
        }
      }

      if (name === 'startDate') {
        if (joiningDate && value < joiningDate) {
          next.startDate = joiningDate
          next.endDate = joiningDate
          return next
        }
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

  const openApplyModal = (options = {}) => {
    const selectedLeaveTypeId = String(
      options.leaveTypeId || form.leaveTypeId || leaveTypes[0]?.id || '',
    )

    setEditingLeave(null)
    setForm((current) => ({
      ...emptyForm,
      employeeId: isAdmin
        ? current.employeeId || getEmployeeUserId(employees[0])
        : currentUserEmployeeId,
      leaveTypeId: selectedLeaveTypeId,
    }))
    setIsApplyOpen(true)
  }

  const closeApplyModal = () => {
    setIsApplyOpen(false)
    setEditingLeave(null)
  }

  const handleApplySubmit = async (event) => {
    event.preventDefault()
    const employee =
      employees.find((item) => getEmployeeUserId(item) === String(form.employeeId)) || null
    const joiningDate = getJoiningDate(employee)

    if (joiningDate && form.startDate && form.startDate < joiningDate) {
      toastService.show({
        severity: 'warn',
        summary: 'Invalid start date',
        detail: `Leave cannot start before the employee joining date (${formatDate(joiningDate)}).`,
        life: 3500,
      })
      return
    }

    const payload = {
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
    }

    if (editingLeave?.id) {
      await updateLeave({
        id: editingLeave.id,
        ...payload,
      }).unwrap()

      if (selectedLeave?.id === editingLeave.id) {
        setSelectedLeave((current) =>
          current
            ? {
                ...current,
                ...payload,
                leaveTypeName:
                  leaveTypeMap.get(String(payload.leaveTypeId))?.name || current.leaveTypeName,
              }
            : current,
        )
      }
    } else {
      await createLeave({
        ...payload,
        status: 'pending',
      }).unwrap()
    }

    setIsApplyOpen(false)
    setEditingLeave(null)
    setForm({
      ...emptyForm,
      employeeId: form.employeeId,
      leaveTypeId: form.leaveTypeId,
    })
  }

  const handleDeleteLeave = (leave) => {
    if (!isAdmin || !leave?.id) return

    closeActiveMenu()
    setDeleteConfirmLeave(leave)
  }

  const closeDeleteConfirm = () => {
    setDeleteConfirmLeave(null)
  }

  const confirmDeleteLeave = async () => {
    if (!deleteConfirmLeave?.id) return

    await deleteLeave(deleteConfirmLeave.id).unwrap()
    setDeleteConfirmLeave(null)
    if (selectedLeave?.id === deleteConfirmLeave.id) {
      setSelectedLeave(null)
    }
  }

  useEffect(() => {
    if (!location.state?.openApplyModal || !showApplyButton) return

    openApplyModal({ leaveTypeId: location.state?.leaveTypeId })
    navigate(location.pathname, { replace: true, state: {} })
  }, [
    currentUserEmployeeId,
    employees,
    form.leaveTypeId,
    leaveTypes,
    location.pathname,
    location.state,
    navigate,
    showApplyButton,
  ])

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
  const selectedFormEmployee = employees.find(
    (employee) => String(getEmployeeUserId(employee)) === String(form.employeeId),
  )
  const formJoiningDate = getJoiningDate(selectedFormEmployee)
  const selectedEmployeeHistory = selectedLeave
    ? leaveHistoryByEmployee.get(String(selectedLeave.userId)) || []
    : []
  const selectedEmployeeApprovedCount = selectedEmployeeHistory.filter((leave) => leave.status === 'approved').length
  const selectedEmployeePendingCount = selectedEmployeeHistory.filter((leave) => leave.status === 'pending').length
  const selectedEmployeeCancelledCount = selectedEmployeeHistory.filter((leave) => leave.status === 'cancelled').length
  const selectedReportingManagerName = (() => {
    const managerId = String(selectedLeave?.reportingManagerId || selectedEmployee?.reporting_manager || '').trim()
    if (!managerId) return '-'

    const employeeManager = employeeMap.get(managerId)
    if (employeeManager) {
      return getEmployeeName(employeeManager)
    }

    const manager = managerMap.get(managerId)
    if (manager) {
      return getEmployeeName(manager)
    }

    return managerId
  })()

  return (
    <div className="approvals-page">
      <section className="approvals-card">
        <div className="approvals-header">
          <div>
            <h2>{pageTitle}</h2>
            <p>{pageDescription}</p>
          </div>
          <div className="approvals-header-actions">
            <div className="approvals-search">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search"
              />
              <button type="button" className="approvals-primary-btn">
                Search
              </button>
            </div>
            {showApplyButton ? (
              <button type="button" className="approvals-primary-btn" onClick={openApplyModal}>
                Apply Leave
              </button>
            ) : null}
          </div>
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
                    {loadingCopy}
                  </td>
                </tr>
              ) : filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan="8" className="approvals-empty">
                    {searchTerm ? 'No matching leave requests found.' : emptyCopy}
                  </td>
                </tr>
              ) : (
                paginatedItems.map((leave) => (
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
                      <div className="approval-menu-wrap" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          className="approval-menu-trigger"
                          aria-expanded={activeMenuId === leave.id}
                          onClick={(event) => handleMenuToggle(event, leave.id)}
                          aria-label={`Open actions for ${leave.employeeName || 'leave request'}`}
                        >
                          <span />
                          <span />
                          <span />
                        </button>
                        {activeMenuId === leave.id ? (
                          <div
                            className={`approval-menu ${
                              activeMenuDirection === 'up' ? 'approval-menu-up' : 'approval-menu-down'
                            }`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button type="button" onClick={() => openLeaveDetails(leave)}>
                              View
                            </button>
                            {canEditOwnLeave(leave) ? (
                              <button type="button" onClick={() => openEditLeaveModal(leave)}>
                                Edit
                              </button>
                            ) : null}
                            {canManageLeave(leave) && isPendingLeave(leave) ? (
                              <button type="button" onClick={() => openAssignManagerModal(leave)}>
                                Forward
                              </button>
                            ) : null}
                            {canManageLeave(leave) && isPendingLeave(leave) ? (
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
                                  onClick={() => openRejectModal(leave)}
                                  disabled={isUpdating}
                                >
                                  Reject
                                </button>
                              </>
                            ) : null}
                            {isAdmin ? (
                              <button
                                type="button"
                                className="danger"
                                onClick={() => handleDeleteLeave(leave)}
                                disabled={isDeleting}
                              >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                              </button>
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
        <PaginationControls
          currentPage={currentPage}
          endItem={endItem}
          onPageChange={setCurrentPage}
          startItem={startItem}
          totalItems={totalItems}
          totalPages={totalPages}
        />
      </section>

      {selectedLeave ? (
        <div className="approval-overlay" onClick={() => setSelectedLeave(null)}>
          <div className="approval-modal approval-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="approval-modal-head">
              <div>
                <h3>Employee Leave Details</h3>
                <p>Approval record, employee profile, and leave summary in one view.</p>
              </div>
              <button
                type="button"
                className="approval-close-btn"
                onClick={() => setSelectedLeave(null)}
                aria-label="Close dialog"
              >
                &times;
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
                <span>Total Leave Requests</span>
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
                      <strong>{selectedReportingManagerName}</strong>
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

                {isAdmin && selectedLeave?.id ? (
                  <ActivityTimeline
                    title="Leave Timeline"
                    description="Approval, forwarding, and edit history for this leave request."
                    moduleName="leaves"
                    entityType="leave"
                    entityId={selectedLeave.id}
                    limit={12}
                    compact
                  />
                ) : null}
              </aside>
            </div>

            <div className="approval-modal-actions">
              <button type="button" className="approval-secondary-btn" onClick={() => setSelectedLeave(null)}>
                Close
              </button>
              {canEditOwnLeave(selectedLeave) ? (
                <button
                  type="button"
                  className="approvals-primary-btn"
                  onClick={() => openEditLeaveModal(selectedLeave)}
                >
                  Edit
                </button>
              ) : null}
              {canManageLeave(selectedLeave) && isPendingLeave(selectedLeave) ? (
                <button
                  type="button"
                  className="approval-forward-btn"
                  onClick={() => openAssignManagerModal(selectedLeave)}
                  disabled={isUpdating}
                >
                  Forward
                </button>
              ) : null}
              {canManageLeave(selectedLeave) && isPendingLeave(selectedLeave) ? (
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
                    onClick={() => openRejectModal(selectedLeave)}
                    disabled={isUpdating}
                  >
                    Reject
                  </button>
                </>
              ) : null}
              {isAdmin ? (
                <button
                  type="button"
                  className="approval-reject-btn"
                  onClick={() => handleDeleteLeave(selectedLeave)}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
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
                <h3>Forward leave request</h3>
                <p>Employee Name : {assignManagerLeave.employeeName || '-'}</p>
              </div>
              <button
                type="button"
                className="approval-close-btn"
                onClick={() => setAssignManagerLeave(null)}
                aria-label="Close dialog"
              >
                &times;
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
                  {assignableManagers.map((manager) => (
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
                <button type="submit" className="approvals-primary-btn" disabled={isUpdating}>
                  {isUpdating ? 'Forwarding...' : 'Forward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {rejectingLeave ? (
        <div className="approval-overlay" onClick={closeRejectModal}>
          <div className="approval-modal approval-compact-modal" onClick={(event) => event.stopPropagation()}>
            <div className="approval-modal-head">
              <div>
                <h3>Reject Leave</h3>
                <p>Add the reason for rejecting this leave request.</p>
              </div>
              <button type="button" className="approval-close-btn" onClick={closeRejectModal} aria-label="Close dialog">
                &times;
              </button>
            </div>

            <form className="approval-form" onSubmit={handleRejectSubmit}>
              <div className="approval-reject-summary">
                <strong>{rejectingLeave.employeeName || '-'}</strong>
                <span>
                  {rejectingLeave.leaveTypeName} | {formatDate(rejectingLeave.startDate)} to {formatDate(rejectingLeave.endDate)}
                </span>
              </div>

              <label>
                <span>Rejection Reason</span>
                <textarea
                  name="rejectionReason"
                  value={rejectionNote}
                  onChange={(event) => setRejectionNote(event.target.value)}
                  placeholder="Explain why this leave request is being rejected"
                  rows={5}
                  required
                />
              </label>

              <div className="approval-modal-actions">
                <button type="button" className="approval-secondary-btn" onClick={closeRejectModal}>
                  Cancel
                </button>
                <button type="submit" className="approval-reject-btn" disabled={isUpdating || !rejectionNote.trim()}>
                  {isUpdating ? 'Rejecting...' : 'Submit Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteConfirmLeave)}
        title="Delete Leave Record"
        description="This action will permanently remove the selected leave request."
        onCancel={closeDeleteConfirm}
        onConfirm={confirmDeleteLeave}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        confirmClassName="danger"
        isLoading={isDeleting}
      >
        <div className="confirm-dialog-summary">
          <strong>{deleteConfirmLeave?.employeeName || '-'}</strong>
          <span>
            {deleteConfirmLeave?.leaveTypeName || '-'} | {formatDate(deleteConfirmLeave?.startDate)} to{' '}
            {formatDate(deleteConfirmLeave?.endDate)}
          </span>
          <p>Delete this leave record and update the leave balance?</p>
        </div>
      </ConfirmDialog>

      {isApplyOpen ? (
        <div className="approval-overlay" onClick={closeApplyModal}>
          <div className="approval-modal approval-form-modal" onClick={(event) => event.stopPropagation()}>
            <div className="approval-modal-head">
              <div>
                <h3>{editingLeave ? 'Edit Leave' : 'Apply Leave'}</h3>
                <p>
                  {editingLeave
                    ? 'Update your pending leave request.'
                    : 'Create a new leave request using the same approval workflow.'}
                </p>
              </div>
              <button type="button" className="approval-close-btn" onClick={closeApplyModal} aria-label="Close dialog">
                &times;
              </button>
            </div>

            <form className="approval-form" onSubmit={handleApplySubmit}>
              <div className="approval-form-grid approval-form-grid-top">
                <label>
                  <span>Employee</span>
                  <select
                    name="employeeId"
                    value={form.employeeId}
                    onChange={handleFormChange}
                    required
                    disabled={Boolean(editingLeave) || !isAdmin}
                  >
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
                    min={formJoiningDate || undefined}
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
                <button
                  type="submit"
                  className="approvals-primary-btn"
                  disabled={isCreating || isUpdating}
                >
                  {editingLeave ? (isUpdating ? 'Saving...' : 'Save Changes') : isCreating ? 'Applying...' : 'Apply'}
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
