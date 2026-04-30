
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useGetLookupsQuery } from '../redux/api/lookupApi'
import {
  useCreateEmployeeMutation,
  useDeleteEmployeeMutation,
  useGetEmployeesQuery,
  useGetManagersQuery,
  useUpdateEmployeeMutation,
} from '../redux/api/employeeApi'
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

function Employees() {
  const user = useSelector((state) => state.auth.user)
  const isAdmin = isAdminUser(user)
  const [searchTerm, setSearchTerm] = useState('')
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [formData, setFormData] = useState(initialFormState)
  const [sameAddress, setSameAddress] = useState(false)
  const [formError, setFormError] = useState('')

  const { data: employeesData, isLoading, isFetching } = useGetEmployeesQuery()
  const { data: departmentsData } = useGetLookupsQuery('departments')
  const { data: designationsData } = useGetLookupsQuery('designations')
  const { data: districtsData } = useGetLookupsQuery('districts')
  const { data: statesData } = useGetLookupsQuery('states')
  const { data: managersData } = useGetManagersQuery(undefined, { skip: !isAdmin })
  const [createEmployee, { isLoading: isCreating }] = useCreateEmployeeMutation()
  const [updateEmployee, { isLoading: isUpdating }] = useUpdateEmployeeMutation()
  const [deleteEmployee, { isLoading: isDeleting }] = useDeleteEmployeeMutation()

  const branchTable = formData.branch_type || null
  const { data: branchData } = useGetLookupsQuery(branchTable, {
    skip: !branchTable,
  })

  const employees = employeesData?.data || []
  const departments = departmentsData?.data || []
  const designations = designationsData?.data || []
  const districts = districtsData?.data || []
  const states = statesData?.data || []
  const managers = managersData?.data || []
  const branches = branchData?.data || []

  const departmentMap = useMemo(
    () => new Map(departments.map((item) => [String(item.id), item.name])),
    [departments],
  )
  const designationMap = useMemo(
    () => new Map(designations.map((item) => [String(item.id), item.name])),
    [designations],
  )

  useEffect(() => {
    const closeMenu = () => setMenuOpenId(null)
    window.addEventListener('click', closeMenu)
    return () => window.removeEventListener('click', closeMenu)
  }, [])

  const filteredEmployees = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return employees

    return employees.filter((employee) => {
      const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
      const departmentName = departmentMap.get(String(employee.department_id || '')) || ''
      const designationName = designationMap.get(String(employee.designation_id || '')) || ''
      const employeeCode = formatEmployeeCode(employee)

      return [
        employeeCode,
        fullName,
        employee.user_name,
        employee.email,
        departmentName,
        designationName,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [departmentMap, designationMap, employees, searchTerm])

  const profileEmployee = !isAdmin ? filteredEmployees[0] || employees[0] || null : null

  useEffect(() => {
    if (!isAdmin && profileEmployee) {
      const nextForm = buildInitialFormData(profileEmployee)
      setEditingEmployee(profileEmployee)
      setFormData(nextForm)
      setSameAddress(
        nextForm.permanent_address === nextForm.correspondence_address &&
          nextForm.permanent_state === nextForm.correspondence_state &&
          nextForm.permanent_district === nextForm.correspondence_district &&
          nextForm.permanent_pin === nextForm.correspondence_pin,
      )
    }
  }, [isAdmin, profileEmployee])

  const openAddModal = () => {
    if (!isAdmin) return
    setEditingEmployee(null)
    setFormData(initialFormState)
    setSameAddress(false)
    setFormError('')
    setIsFormOpen(true)
  }

  const openEditModal = (employee) => {
    const nextForm = buildInitialFormData(employee)
    setEditingEmployee(employee)
    setFormData(nextForm)
    setSameAddress(
      nextForm.permanent_address === nextForm.correspondence_address &&
        nextForm.permanent_state === nextForm.correspondence_state &&
        nextForm.permanent_district === nextForm.correspondence_district &&
        nextForm.permanent_pin === nextForm.correspondence_pin,
    )
    setFormError('')
    setIsFormOpen(true)
    setMenuOpenId(null)
  }

  const closeFormModal = () => {
    setIsFormOpen(false)
    setEditingEmployee(null)
    setFormData(initialFormState)
    setSameAddress(false)
    setFormError('')
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      let next = { ...prev, [name]: value }
      if (name === 'branch_type') {
        next.branch_id = ''
      }
      if (
        sameAddress &&
        ['permanent_address', 'permanent_state', 'permanent_district', 'permanent_pin'].includes(
          name,
        )
      ) {
        next = syncAddressFields(next)
      }
      return next
    })
  }

  const handleSameAddressChange = (e) => {
    const checked = e.target.checked
    setSameAddress(checked)
    setFormData((prev) => (checked ? syncAddressFields(prev) : prev))
  }

  const getEmployeePayload = (isEditing) => {
    const payload = { ...formData }
    if (isEditing && !payload.user_name) {
      delete payload.user_name
    }

    return payload
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    const activeEmployee = isAdmin ? editingEmployee : profileEmployee
    const isEditing = Boolean(activeEmployee)

    try {
      const payload = getEmployeePayload(isEditing)
      if (isEditing) {
        await updateEmployee({ id: activeEmployee.id, ...payload }).unwrap()
      } else {
        await createEmployee(payload).unwrap()
      }
      if (isAdmin) {
        closeFormModal()
      }
    } catch (error) {
      setFormError(error?.data?.error || 'Failed to save employee.')
    }
  }

  const handleDelete = async (employee) => {
    setMenuOpenId(null)
    const name = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'this employee'
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) {
      return
    }

    try {
      await deleteEmployee(employee.id).unwrap()
    } catch (_) {
      // Toasts are already handled centrally by the base query.
    }
  }

  const stopMenuToggle = (e, employeeId) => {
    e.stopPropagation()
    setMenuOpenId((prev) => (prev === employeeId ? null : employeeId))
  }

  const isSubmitLoading = isCreating || isUpdating

  return (
    <div className="employee-page">
      {!isAdmin ? (
        <div className="employee-list-card employee-profile-card">
          <div className="employee-toolbar employee-profile-toolbar">
            <div>
              <h2>My Profile</h2>
              <p className="employee-profile-subtitle">Update your personal and contact information here.</p>
            </div>
          </div>

          {isLoading || isFetching ? (
            <div className="employee-empty">Loading profile...</div>
          ) : !profileEmployee ? (
            <div className="employee-empty">Your profile details are not available yet.</div>
          ) : (
            <form className="employee-form employee-profile-form" onSubmit={handleSubmit}>
              <section className="employee-card">
                <div className="card-title">Personal Detail</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Employee Code</label>
                    <input type="text" value={formatEmployeeCode(profileEmployee)} readOnly />
                  </div>
                  <div className="form-group">
                    <label>User Name</label>
                    <input type="text" value={formData.user_name} readOnly />
                  </div>
                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      placeholder="Enter first name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      placeholder="Enter last name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Date of Birth *</label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Gender *</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter Email Address"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>CPF Number</label>
                    <input type="text" value={formData.cpf_number} readOnly />
                  </div>
                </div>
              </section>

              <section className="employee-card">
                <div className="card-title">Contact Info</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Mobile Number *</label>
                    <input
                      type="text"
                      name="mobile_number"
                      value={formData.mobile_number}
                      onChange={handleInputChange}
                      placeholder="Enter Mobile Number"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Emergency Contact Number *</label>
                    <input
                      type="text"
                      name="emergency_contact_number"
                      value={formData.emergency_contact_number}
                      onChange={handleInputChange}
                      placeholder="Enter Emergency Contact Number"
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
                      placeholder="Enter Emergency Contact Name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>District *</label>
                    <select
                      name="permanent_district"
                      value={formData.permanent_district}
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
                    <label>State *</label>
                    <select
                      name="permanent_state"
                      value={formData.permanent_state}
                      onChange={handleInputChange}
                      required
                    >
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
                    <input
                      type="text"
                      name="permanent_pin"
                      value={formData.permanent_pin}
                      onChange={handleInputChange}
                      placeholder="Enter Pincode"
                      required
                    />
                  </div>
                  <div className="form-group form-group-full">
                    <label>Permanent Address *</label>
                    <textarea
                      name="permanent_address"
                      value={formData.permanent_address}
                      onChange={handleInputChange}
                      placeholder="Enter Permanent Address"
                      rows="3"
                      required
                    />
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
                      placeholder="Enter Correspondence Address"
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
                      placeholder="Enter Pincode"
                      required
                    />
                  </div>
                </div>
              </section>

              {formError && <div className="form-error">{formError}</div>}

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={isSubmitLoading}>
                  {isSubmitLoading ? 'Saving...' : 'Update Profile'}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
      <div className="employee-list-card">
        <div className="employee-toolbar">
          <h2>{isAdmin ? 'Manage Employees' : 'My Profile'}</h2>
          <div className="employee-toolbar-actions">
            {isAdmin ? (
              <>
                <div className="employee-search">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search"
                  />
                  <button type="button" className="btn btn-primary btn-search">
                    Search
                  </button>
                </div>
                <button type="button" className="btn btn-primary" onClick={openAddModal}>
                  Add Employee
                </button>
              </>
            ) : profileEmployee ? (
              <button type="button" className="btn btn-primary" onClick={() => openEditModal(profileEmployee)}>
                Edit Profile
              </button>
            ) : null}
          </div>
        </div>

        <div className="employee-table-wrap">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Employee Id</th>
                <th>Name</th>
                <th>Department</th>
                <th>Date Of Joining</th>
                <th>Designation</th>
                <th className="employee-action-head">{isAdmin ? 'Action' : 'Profile'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => {
                const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || '-'
                return (
                  <tr key={employee.id}>
                    <td className="employee-code">{formatEmployeeCode(employee)}</td>
                    <td>{fullName}</td>
                    <td>{departmentMap.get(String(employee.department_id || '')) || '-'}</td>
                    <td>{formatDisplayDate(employee.date_of_joining)}</td>
                    <td>{designationMap.get(String(employee.designation_id || '')) || '-'}</td>
                    <td className="employee-action-cell">
                      {isAdmin ? (
                        <div className="employee-action-menu" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="employee-menu-trigger"
                            onClick={(e) => stopMenuToggle(e, employee.id)}
                            aria-label={`Open actions for ${fullName}`}
                          >
                            <span />
                            <span />
                            <span />
                          </button>
                          {menuOpenId === employee.id && (
                            <div className="employee-menu-popup">
                              <button type="button" onClick={() => openEditModal(employee)}>
                                Edit
                              </button>
                              <button
                                type="button"
                                className="danger"
                                onClick={() => handleDelete(employee)}
                                disabled={isDeleting}
                              >
                                Trash
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button type="button" className="btn btn-secondary" onClick={() => openEditModal(employee)}>
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!isLoading && filteredEmployees.length === 0 && (
            <div className="employee-empty">
              {searchTerm ? 'No employees match your search.' : 'No employees found.'}
            </div>
          )}
          {(isLoading || isFetching) && <div className="employee-empty">Loading employees...</div>}
        </div>
      </div>
      )}

      {isAdmin && isFormOpen && (
        <div className="employee-modal-backdrop" onClick={closeFormModal}>
          <div className="employee-modal employee-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="employee-modal-header">
              <div>
                <h3>{!isAdmin ? 'Edit Profile' : editingEmployee ? 'Edit Employee' : 'Add Employee'}</h3>
                <p>
                  {!isAdmin
                    ? 'Update your basic profile information and save your changes.'
                    : editingEmployee
                    ? 'Update the employee record and save your changes.'
                    : 'Fill out the employee details to create a new record.'}
                </p>
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
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      placeholder="Enter first name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      placeholder="Enter last name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Date of Birth *</label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Gender *</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter Email Address"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>User Name *</label>
                    <input
                      type="text"
                      name="user_name"
                      value={formData.user_name}
                      onChange={handleInputChange}
                      placeholder="Enter user name"
                      required
                      disabled={!isAdmin}
                    />
                  </div>
                  {!editingEmployee && isAdmin && (
                    <>
                      <div className="form-group">
                        <label>Password *</label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password || ''}
                          onChange={handleInputChange}
                          placeholder="Enter Password"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Confirm Password *</label>
                        <input
                          type="password"
                          name="confirm_password"
                          value={formData.confirm_password || ''}
                          onChange={handleInputChange}
                          placeholder="Confirm password"
                          required
                        />
                      </div>
                    </>
                  )}
                </div>
              </section>

              {isAdmin ? (
              <section className="employee-card">
                <div className="card-title">Employment Detail</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Department Name *</label>
                    <select
                      name="department_id"
                      value={formData.department_id}
                      onChange={handleInputChange}
                      required
                    >
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
                    <select
                      name="designation"
                      value={formData.designation}
                      onChange={handleInputChange}
                      required
                    >
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
                      placeholder="Enter Employment Type"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Reporting Manager</label>
                    <select
                      name="reporting_manager"
                      value={formData.reporting_manager}
                      onChange={handleInputChange}
                    >
                      <option value="">Reporting Manager</option>
                      {managers.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.first_name || ''} {item.last_name || ''} ({item.user_name || item.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>CPF Number *</label>
                    <input
                      type="text"
                      name="cpf_number"
                      value={formData.cpf_number}
                      onChange={handleInputChange}
                      placeholder="Enter CPF Number"
                      required
                    />
                  </div>
                </div>
              </section>
              ) : null}

              <section className="employee-card">
                <div className="card-title">Contact Info</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Mobile Number *</label>
                    <input
                      type="text"
                      name="mobile_number"
                      value={formData.mobile_number}
                      onChange={handleInputChange}
                      placeholder="Enter Mobile Number"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Emergency Contact Number *</label>
                    <input
                      type="text"
                      name="emergency_contact_number"
                      value={formData.emergency_contact_number}
                      onChange={handleInputChange}
                      placeholder="Enter Emergency Contact Number"
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
                      placeholder="Enter Emergency Contact Name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>District *</label>
                    <select
                      name="permanent_district"
                      value={formData.permanent_district}
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
                    <label>State *</label>
                    <select
                      name="permanent_state"
                      value={formData.permanent_state}
                      onChange={handleInputChange}
                      required
                    >
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
                    <input
                      type="text"
                      name="permanent_pin"
                      value={formData.permanent_pin}
                      onChange={handleInputChange}
                      placeholder="Enter Pincode"
                      required
                    />
                  </div>
                  {isAdmin ? (
                    <>
                      <div className="form-group">
                        <label>Organization Branching *</label>
                        <select
                          name="branch_type"
                          value={formData.branch_type}
                          onChange={handleInputChange}
                          required
                        >
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
                          disabled={!branchTable}
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
                    <textarea
                      name="permanent_address"
                      value={formData.permanent_address}
                      onChange={handleInputChange}
                      placeholder="Enter Permanent Address"
                      rows="3"
                      required
                    />
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
                      placeholder="Enter Correspondence Address"
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
                      placeholder="Enter Pincode"
                      required
                    />
                  </div>
                </div>
              </section>

              {formError && <div className="form-error">{formError}</div>}

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeFormModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitLoading}>
                  {isSubmitLoading ? 'Saving...' : !isAdmin ? 'Update Profile' : editingEmployee ? 'Update Employee' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default Employees
