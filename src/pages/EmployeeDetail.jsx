import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import {
  useGetEmployeeByIdQuery,
  useGetManagersQuery,
  useUpdateEmployeeMutation,
} from '../redux/api/employeeApi'
import { useGetLeavesQuery } from '../redux/api/leaveApi'
import { useGetLeaveTypesQuery } from '../redux/api/leaveTypeApi'
import { useGetLookupsQuery } from '../redux/api/lookupApi'
import { isAdminUser } from '../utils/access'
import '../styles/Employees.css'

const initialFormState = {
  first_name: '',
  last_name: '',
  user_name: '',
  date_of_birth: '',
  gender: '',
  cpf_number: '',
  email: '',
  department_id: '',
  designation: '',
  date_of_joining: '',
  employment_type: '',
  reporting_manager: '',
  mobile_number: '',
  emergency_contact_name: '',
  emergency_contact_number: '',
  permanent_address: '',
  permanent_state: '',
  permanent_district: '',
  permanent_pin: '',
  correspondence_address: '',
  correspondence_state: '',
  correspondence_district: '',
  correspondence_pin: '',
  branch_type: '',
  branch_id: '',
}

const branchOptions = [
  { value: 'divisions', label: 'Division' },
  { value: 'circles', label: 'Circle' },
  { value: 'sub_divisions', label: 'Sub Division' },
]

const syncAddressFields = (data) => ({
  ...data,
  correspondence_address: data.permanent_address,
  correspondence_state: data.permanent_state,
  correspondence_district: data.permanent_district,
  correspondence_pin: data.permanent_pin,
})

const parseBranching = (value) => {
  if (!value || !String(value).includes('-')) {
    return { branch_type: '', branch_id: '' }
  }
  const [branch_type, branch_id] = String(value).split('-', 2)
  return { branch_type, branch_id }
}

const normalizeDateInput = (value) => {
  if (!value) return ''
  const raw = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split('-')
    return `${year}-${month}-${day}`
  }
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const formatDisplayDate = (value) => {
  if (!value) return '-'
  const normalized = normalizeDateInput(value)
  if (!normalized) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(`${normalized}T00:00:00`))
}

const formatEmployeeCode = (employee) => {
  const raw = employee?.emp_id || employee?.id || ''
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return String(raw || '-').toUpperCase()
  return `EPID${digits.padStart(5, '0')}`
}

const getEmployeeUserId = (employee) =>
  String(employee?.emp_id || employee?.employeeUserId || employee?.rowid || employee?.id || '')

const buildInitialFormData = (employee) => {
  if (!employee) {
    return initialFormState
  }

  const branchInfo = parseBranching(employee.organization_branching)

  return {
    ...initialFormState,
    first_name: employee.first_name || '',
    last_name: employee.last_name || '',
    user_name: employee.user_name || '',
    date_of_birth: normalizeDateInput(employee.dob),
    gender: employee.gender || '',
    cpf_number: employee.cpf_number || '',
    email: employee.email || '',
    department_id: employee.department_id || '',
    designation: employee.designation_id || '',
    date_of_joining: normalizeDateInput(employee.date_of_joining),
    employment_type: employee.employment_type || '',
    reporting_manager: employee.reporting_manager || '',
    mobile_number: employee.mobile || '',
    emergency_contact_name: employee.emergency_contact_name || '',
    emergency_contact_number: employee.emergency_contact_number || '',
    permanent_address: employee.permanent_address || '',
    permanent_state: employee.permanent_state || '',
    permanent_district: employee.permanent_district || '',
    permanent_pin: employee.permanent_pin || '',
    correspondence_address: employee.correspondence_address || '',
    correspondence_state: employee.correspondence_state || '',
    correspondence_district: employee.correspondence_district || '',
    correspondence_pin: employee.correspondence_pin || '',
    branch_type: branchInfo.branch_type,
    branch_id: branchInfo.branch_id,
  }
}

const getEmployeeName = (employee) => {
  if (!employee) return '-'
  return `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.user_name || employee.email || '-'
}

const getDaysValue = (leave) => {
  const explicitDays = Number(leave?.days)
  if (Number.isFinite(explicitDays) && explicitDays > 0) return explicitDays

  const startDate = normalizeDateInput(leave?.startDate)
  const endDate = normalizeDateInput(leave?.endDate)
  if (!startDate || !endDate) return 0

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0

  const millisecondsPerDay = 24 * 60 * 60 * 1000
  const totalDays = Math.max(1, Math.round((end - start) / millisecondsPerDay) + 1)
  const hasPartialLeave =
    leave?.shortLeave || leave?.halfLeave || leave?.shortLeaveDate || leave?.halfLeaveDate

  return hasPartialLeave ? Math.max(0.5, totalDays - 0.5) : totalDays
}

const statusLabel = (status) => {
  const normalized = String(status || 'pending').toLowerCase()
  if (normalized === 'cancelled') return 'Cancelled'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

const normalizeStatusClass = (status) => `approval-status approval-status-${String(status || 'pending').toLowerCase()}`

const formatBalanceValue = (value) => {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(1)
}

function EmployeeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useSelector((state) => state.auth.user)
  const isAdmin = isAdminUser(user)
  const [activeTab, setActiveTab] = useState('leaves')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState(initialFormState)
  const [sameAddress, setSameAddress] = useState(false)
  const [formError, setFormError] = useState('')

  const { data: employeeResponse, isLoading, isFetching, error } = useGetEmployeeByIdQuery(id, {
    skip: !id,
  })
  const { data: leavesResponse } = useGetLeavesQuery()
  const { data: leaveTypesResponse } = useGetLeaveTypesQuery()
  const { data: departmentsData } = useGetLookupsQuery('departments')
  const { data: designationsData } = useGetLookupsQuery('designations')
  const { data: districtsData } = useGetLookupsQuery('districts')
  const { data: statesData } = useGetLookupsQuery('states')
  const { data: managersData } = useGetManagersQuery(undefined, { skip: !isAdmin })
  const [updateEmployee, { isLoading: isUpdating }] = useUpdateEmployeeMutation()

  const employee = employeeResponse?.data || null
  const leaves = leavesResponse?.data || []
  const leaveTypes = leaveTypesResponse?.data || []
  const departments = departmentsData?.data || []
  const designations = designationsData?.data || []
  const districts = districtsData?.data || []
  const states = statesData?.data || []
  const managers = managersData?.data || []

  const departmentMap = useMemo(
    () => new Map(departments.map((item) => [String(item.id), item.name])),
    [departments],
  )
  const managerMap = useMemo(
    () =>
      new Map(
        managers.map((item) => [
          String(item.id),
          `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.user_name || item.email || item.id,
        ]),
      ),
    [managers],
  )
  const designationMap = useMemo(
    () => new Map(designations.map((item) => [String(item.id), item.name])),
    [designations],
  )
  const districtMap = useMemo(
    () => new Map(districts.map((item) => [String(item.id), item.name])),
    [districts],
  )
  const stateMap = useMemo(
    () => new Map(states.map((item) => [String(item.id), item.name])),
    [states],
  )

  const branchInfo = useMemo(
    () => parseBranching(employee?.organization_branching),
    [employee?.organization_branching],
  )
  const branchTable = formData.branch_type || branchInfo.branch_type || null
  const { data: branchData } = useGetLookupsQuery(branchTable, {
    skip: !branchTable,
  })
  const branches = branchData?.data || []
  const branchMap = useMemo(
    () => new Map(branches.map((item) => [String(item.id), item.name])),
    [branches],
  )

  const assignableManagers = useMemo(() => {
    const employeeUserId = getEmployeeUserId(employee)

    return managers.filter((manager) => {
      if (String(manager.role_id || '') === '1') {
        return false
      }

      if (employeeUserId && String(manager.id || '') === employeeUserId) {
        return false
      }

      return true
    })
  }, [employee, managers])

  const leaveTypeMap = useMemo(
    () => new Map(leaveTypes.map((type) => [String(type.id), type])),
    [leaveTypes],
  )

  const employeeLeaves = useMemo(() => {
    const employeeUserId = getEmployeeUserId(employee)
    return leaves
      .filter((leave) => String(leave.userId || '') === employeeUserId)
      .map((leave) => {
        const leaveType = leaveTypeMap.get(String(leave.leaveTypeId))
        return {
          ...leave,
          leaveTypeName: leave.leaveTypeName || leave.leaveType || leaveType?.name || '-',
          status: String(leave.status || 'pending').toLowerCase(),
          daysValue: getDaysValue(leave),
        }
      })
      .sort((left, right) => String(right.startDate || '').localeCompare(String(left.startDate || '')))
  }, [employee, leaveTypeMap, leaves])

  const leaveBalances = useMemo(() => {
    return leaveTypes.map((type) => {
      const used = employeeLeaves
        .filter((leave) => String(leave.leaveTypeId || '') === String(type.id) && leave.status === 'approved')
        .reduce((total, leave) => total + leave.daysValue, 0)

      const total = Number(type.totalLeaves || 0)
      const progress = total > 0 ? Math.min((used / total) * 100, 100) : 0

      return {
        id: type.id,
        name: type.name,
        used,
        total,
        progress,
      }
    })
  }, [employeeLeaves, leaveTypes])

  useEffect(() => {
    if (!employee) return
    const nextForm = buildInitialFormData(employee)
    setFormData(nextForm)
    setSameAddress(
      nextForm.permanent_address === nextForm.correspondence_address &&
        nextForm.permanent_state === nextForm.correspondence_state &&
        nextForm.permanent_district === nextForm.correspondence_district &&
        nextForm.permanent_pin === nextForm.correspondence_pin,
    )
  }, [employee])

  const openEditModal = () => {
    if (!employee) return
    const nextForm = buildInitialFormData(employee)
    setFormData(nextForm)
    setSameAddress(
      nextForm.permanent_address === nextForm.correspondence_address &&
        nextForm.permanent_state === nextForm.correspondence_state &&
        nextForm.permanent_district === nextForm.correspondence_district &&
        nextForm.permanent_pin === nextForm.correspondence_pin,
    )
    setFormError('')
    setIsFormOpen(true)
  }

  const closeFormModal = () => {
    setIsFormOpen(false)
    setFormError('')
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => {
      let next = { ...current, [name]: value }
      if (name === 'branch_type') {
        next.branch_id = ''
      }
      if (
        sameAddress &&
        ['permanent_address', 'permanent_state', 'permanent_district', 'permanent_pin'].includes(name)
      ) {
        next = syncAddressFields(next)
      }
      return next
    })
  }

  const handleSameAddressChange = (event) => {
    const checked = event.target.checked
    setSameAddress(checked)
    setFormData((current) => (checked ? syncAddressFields(current) : current))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!employee?.id) return

    const payload = { ...formData }
    if (!payload.user_name) {
      delete payload.user_name
    }

    try {
      await updateEmployee({ id: employee.id, ...payload }).unwrap()
      closeFormModal()
    } catch (submitError) {
      setFormError(submitError?.data?.error || 'Failed to save employee.')
    }
  }

  const renderField = (label, value) => (
    <div className="employee-detail-field">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  )

  return (
    <div className="employee-page employee-detail-page">
      <div className="employee-list-card employee-detail-card">
        <div className="employee-detail-topbar">
          <div>
            <button type="button" className="employee-detail-back" onClick={() => navigate('/employees')}>
              Back to Employees
            </button>
            <h2>Employee Detail</h2>
            <p className="employee-profile-subtitle">
              {employee ? `${getEmployeeName(employee)} • ${formatEmployeeCode(employee)}` : 'View employee profile and leave details.'}
            </p>
          </div>
          {employee ? (
            <button type="button" className="btn btn-primary" onClick={openEditModal}>
              Edit
            </button>
          ) : null}
        </div>

        {isLoading || isFetching ? (
          <div className="employee-empty">Loading employee details...</div>
        ) : error || !employee ? (
          <div className="employee-empty">Employee details are not available.</div>
        ) : (
          <div className="employee-detail-shell">
            <aside className="employee-detail-nav">
              <button
                type="button"
                className={activeTab === 'basic' ? 'is-active' : ''}
                onClick={() => setActiveTab('basic')}
              >
                Basic
              </button>
              <button
                type="button"
                className={activeTab === 'address' ? 'is-active' : ''}
                onClick={() => setActiveTab('address')}
              >
                Address
              </button>
              <button
                type="button"
                className={activeTab === 'leaves' ? 'is-active' : ''}
                onClick={() => setActiveTab('leaves')}
              >
                Leaves
              </button>
            </aside>

            <div className="employee-detail-content">
              {activeTab === 'basic' ? (
                <section className="employee-detail-panel">
                  <div className="employee-detail-grid">
                    {renderField('Employee Code', formatEmployeeCode(employee))}
                    {renderField('User Name', employee.user_name)}
                    {renderField('First Name', employee.first_name)}
                    {renderField('Last Name', employee.last_name)}
                    {renderField('Date of Birth', formatDisplayDate(employee.dob))}
                    {renderField('Gender', employee.gender === 'M' ? 'Male' : employee.gender === 'F' ? 'Female' : employee.gender)}
                    {renderField('Email', employee.email)}
                    {renderField('Mobile Number', employee.mobile)}
                    {renderField('CPF Number', employee.cpf_number)}
                    {renderField('Department', departmentMap.get(String(employee.department_id || '')))}
                    {renderField('Designation', designationMap.get(String(employee.designation_id || '')))}
                    {renderField('Date of Joining', formatDisplayDate(employee.date_of_joining))}
                    {renderField('Employment Type', employee.employment_type)}
                    {renderField('Reporting Manager', managerMap.get(String(employee.reporting_manager || '')) || employee.reporting_manager)}
                    {renderField('Emergency Contact Name', employee.emergency_contact_name)}
                    {renderField('Emergency Contact Number', employee.emergency_contact_number)}
                    {renderField('Branch Type', branchOptions.find((item) => item.value === branchInfo.branch_type)?.label)}
                    {renderField('Branch', branchMap.get(String(branchInfo.branch_id || '')))}
                  </div>
                </section>
              ) : null}

              {activeTab === 'address' ? (
                <section className="employee-detail-panel employee-detail-address-grid">
                  <div className="employee-detail-address-card">
                    <h3>Permanent Address</h3>
                    <div className="employee-detail-stack">
                      {renderField('Address', employee.permanent_address)}
                      {renderField('District', districtMap.get(String(employee.permanent_district || '')))}
                      {renderField('State', stateMap.get(String(employee.permanent_state || '')))}
                      {renderField('Pin Code', employee.permanent_pin)}
                    </div>
                  </div>
                  <div className="employee-detail-address-card">
                    <h3>Correspondence Address</h3>
                    <div className="employee-detail-stack">
                      {renderField('Address', employee.correspondence_address)}
                      {renderField('District', districtMap.get(String(employee.correspondence_district || '')))}
                      {renderField('State', stateMap.get(String(employee.correspondence_state || '')))}
                      {renderField('Pin Code', employee.correspondence_pin)}
                    </div>
                  </div>
                </section>
              ) : null}

              {activeTab === 'leaves' ? (
                <section className="employee-detail-panel">
                  <div className="employee-detail-leave-table">
                    <table className="employee-table employee-detail-history-table">
                      <thead>
                        <tr>
                          <th>Leave Type</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeLeaves.length ? (
                          employeeLeaves.map((leave) => (
                            <tr key={leave.id}>
                              <td>{leave.leaveTypeName}</td>
                              <td>{formatDisplayDate(leave.startDate)}</td>
                              <td>{formatDisplayDate(leave.endDate)}</td>
                              <td>
                                <span className={normalizeStatusClass(leave.status)}>{statusLabel(leave.status)}</span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="employee-detail-empty-cell">
                              No leave found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="employee-detail-balance">
                    <div className="employee-detail-section-head">
                      <h3>Leaves Balance</h3>
                    </div>
                    <div className="employee-balance-grid">
                      {leaveBalances.length ? (
                        leaveBalances.map((item) => (
                          <div key={item.id} className="employee-balance-card">
                            <span>{item.name}</span>
                            <div
                              className="employee-balance-ring"
                              style={{ '--progress': `${item.progress}%` }}
                            >
                              <div>
                                {formatBalanceValue(item.used)} / {formatBalanceValue(item.total)}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="employee-empty">No leave types found.</div>
                      )}
                    </div>
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {isFormOpen ? (
        <div className="employee-modal-backdrop" onClick={closeFormModal}>
          <div className="employee-modal employee-modal-wide" onClick={(event) => event.stopPropagation()}>
            <div className="employee-modal-header">
              <div>
                <h3>{isAdmin ? 'Edit Employee' : 'Edit Profile'}</h3>
                <p>Update the employee record and save your changes.</p>
              </div>
              <button type="button" className="employee-modal-close" onClick={closeFormModal}>
                x
              </button>
            </div>

            <form className="employee-form" onSubmit={handleSubmit}>
              <section className="employee-card">
                <div className="card-title">Personal Detail</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Date of Birth *</label>
                    <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Gender *</label>
                    <select name="gender" value={formData.gender} onChange={handleInputChange} required>
                      <option value="">Select Gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>User Name *</label>
                    <input
                      type="text"
                      name="user_name"
                      value={formData.user_name}
                      onChange={handleInputChange}
                      required
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
              </section>

              {isAdmin ? (
                <section className="employee-card">
                  <div className="card-title">Employment Detail</div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Department Name *</label>
                      <select name="department_id" value={formData.department_id} onChange={handleInputChange} required>
                        <option value="">Department</option>
                        {departments.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Designation *</label>
                      <select name="designation" value={formData.designation} onChange={handleInputChange} required>
                        <option value="">Designation</option>
                        {designations.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Date of Joining *</label>
                      <input
                        type="date"
                        name="date_of_joining"
                        value={formData.date_of_joining}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Employment Type *</label>
                      <input
                        type="text"
                        name="employment_type"
                        value={formData.employment_type}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Reporting Manager</label>
                      <select name="reporting_manager" value={formData.reporting_manager} onChange={handleInputChange}>
                        <option value="">Reporting Manager</option>
                        {assignableManagers.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.first_name || ''} {item.last_name || ''} ({item.user_name || item.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>CPF Number *</label>
                      <input type="text" name="cpf_number" value={formData.cpf_number} onChange={handleInputChange} required />
                    </div>
                  </div>
                </section>
              ) : null}

              <section className="employee-card">
                <div className="card-title">Contact Info</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Mobile Number *</label>
                    <input type="text" name="mobile_number" value={formData.mobile_number} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Emergency Contact Number *</label>
                    <input
                      type="text"
                      name="emergency_contact_number"
                      value={formData.emergency_contact_number}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Emergency Contact Name *</label>
                    <input
                      type="text"
                      name="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>District *</label>
                    <select name="permanent_district" value={formData.permanent_district} onChange={handleInputChange} required>
                      <option value="">Select District</option>
                      {districts.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>State *</label>
                    <select name="permanent_state" value={formData.permanent_state} onChange={handleInputChange} required>
                      <option value="">State</option>
                      {states.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Pin Code *</label>
                    <input type="text" name="permanent_pin" value={formData.permanent_pin} onChange={handleInputChange} required />
                  </div>
                  {isAdmin ? (
                    <>
                      <div className="form-group">
                        <label>Organization Branching *</label>
                        <select name="branch_type" value={formData.branch_type} onChange={handleInputChange} required>
                          <option value="">Select Branch</option>
                          {branchOptions.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Branch *</label>
                        <select
                          name="branch_id"
                          value={formData.branch_id}
                          onChange={handleInputChange}
                          required
                          disabled={!formData.branch_type}
                        >
                          <option value="">Select</option>
                          {branches.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : null}
                  <div className="form-group form-group-full">
                    <label>Permanent Address *</label>
                    <textarea name="permanent_address" value={formData.permanent_address} onChange={handleInputChange} rows="3" required />
                  </div>
                  <div className="form-group checkbox-group">
                    <label>
                      <input type="checkbox" checked={sameAddress} onChange={handleSameAddressChange} />
                      Correspondence address is the same as permanent address.
                    </label>
                  </div>
                  <div className="form-group form-group-full">
                    <label>Correspondence Address *</label>
                    <textarea
                      name="correspondence_address"
                      value={formData.correspondence_address}
                      onChange={handleInputChange}
                      rows="3"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Select State *</label>
                    <select
                      name="correspondence_state"
                      value={formData.correspondence_state}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select State</option>
                      {states.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>District *</label>
                    <select
                      name="correspondence_district"
                      value={formData.correspondence_district}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select District</option>
                      {districts.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Pin Code *</label>
                    <input
                      type="text"
                      name="correspondence_pin"
                      value={formData.correspondence_pin}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </section>

              {formError ? <div className="form-error">{formError}</div> : null}

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeFormModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isUpdating}>
                  {isUpdating ? 'Saving...' : 'Update Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default EmployeeDetail
