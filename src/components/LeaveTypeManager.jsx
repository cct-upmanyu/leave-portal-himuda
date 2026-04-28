import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  useCreateLeaveTypeMutation,
  useDeleteLeaveTypeMutation,
  useGetLeaveTypeByIdQuery,
  useGetLeaveTypesQuery,
  useUpdateLeaveTypeMutation,
} from '../redux/api/leaveTypeApi'
import '../styles/Settings.css'

const emptyForm = {
  name: '',
  code: '',
  totalLeaves: 0,
  monthlyLeaves: 1,
  carryForward: false,
  totalCarryForward: 0,
  totalMonths: 1,
  monthlyCarryForward: 0,
  maximumLeaveLimit: 0,
  isShortLeaveAllowed: false,
  monthlyShortLeave: 0,
  isHalfDayLeaveAllowed: false,
  monthlyHalfDayLeave: 0,
}

const tabConfig = [
  { id: 'general', label: 'General Setting' },
  { id: 'restrictions', label: 'Restrictions' },
]

const getErrorMessage = (err) => err?.data?.error || err?.error || 'Something went wrong.'

const toFormState = (item) => ({
  name: item?.name || '',
  code: item?.code || '',
  totalLeaves: item?.totalLeaves ?? 0,
  monthlyLeaves: item?.monthlyLeaves ?? 1,
  carryForward: Boolean(item?.carryForward),
  totalCarryForward: item?.totalCarryForward ?? 0,
  totalMonths: item?.totalMonths ?? 1,
  monthlyCarryForward: item?.monthlyCarryForward ?? 0,
  maximumLeaveLimit: item?.maximumLeaveLimit ?? 0,
  isShortLeaveAllowed: Boolean(item?.isShortLeaveAllowed),
  monthlyShortLeave: item?.monthlyShortLeave ?? 0,
  isHalfDayLeaveAllowed: Boolean(item?.isHalfDayLeaveAllowed),
  monthlyHalfDayLeave: item?.monthlyHalfDayLeave ?? 0,
})

const getAvatarText = (item) => {
  if (item?.code) return item.code.slice(0, 3).toUpperCase()
  return (item?.name || '')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()
}

function LeaveTypeManager() {
  const navigate = useNavigate()
  const { id, tab } = useParams()
  const activeTab = tab === 'restrictions' ? 'restrictions' : 'general'
  const isDetailView = Boolean(id)

  const { data, isLoading, isError, error } = useGetLeaveTypesQuery()
  const {
    data: selectedLeaveTypeData,
    isLoading: isSelectedLoading,
    isError: isSelectedError,
    error: selectedError,
  } = useGetLeaveTypeByIdQuery(id, {
    skip: !id,
  })

  const [createLeaveType, { isLoading: isCreating }] = useCreateLeaveTypeMutation()
  const [updateLeaveType, { isLoading: isUpdating }] = useUpdateLeaveTypeMutation()
  const [deleteLeaveType, { isLoading: isDeleting }] = useDeleteLeaveTypeMutation()

  const items = data?.data || []
  const selectedLeaveType = selectedLeaveTypeData?.data || null

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyForm)
  const [detailForm, setDetailForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (selectedLeaveType) {
      setDetailForm(toFormState(selectedLeaveType))
      setFormError('')
    }
  }, [selectedLeaveType])

  const sortedItems = useMemo(() => items.slice().sort((a, b) => a.name.localeCompare(b.name)), [items])

  const closeAddModal = () => {
    setIsAddOpen(false)
    setCreateForm(emptyForm)
    setFormError('')
  }

  const handleCreateChange = (event) => {
    const { name, value, type, checked } = event.target
    setCreateForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleDetailChange = (event) => {
    const { name, value, type, checked } = event.target
    setDetailForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const openDetail = (leaveTypeId, nextTab = 'general') => {
    navigate(`/settings/leave-types/${leaveTypeId}/${nextTab}`)
  }

  const goBackToList = () => {
    navigate('/settings/leave-types')
    setFormError('')
  }

  const handleCreateSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    try {
      const created = await createLeaveType(createForm).unwrap()
      closeAddModal()
      if (created?.data?.id) {
        openDetail(created.data.id, 'general')
      }
    } catch (err) {
      setFormError(getErrorMessage(err))
    }
  }

  const handleUpdateSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    try {
      await updateLeaveType({ id, ...detailForm }).unwrap()
    } catch (err) {
      setFormError(getErrorMessage(err))
    }
  }

  const handleDelete = async (leaveTypeId) => {
    try {
      if (!window.confirm('Are you sure you want to delete this leave type?')) {
        return
      }
      await deleteLeaveType(leaveTypeId).unwrap()
      if (String(id || '') === String(leaveTypeId)) {
        goBackToList()
      }
    } catch (err) {
      setFormError(getErrorMessage(err))
    }
  }

  if (isDetailView) {
    return (
      <div className="settings-panel leave-type-detail-page">
        <div className="leave-type-detail-topbar">
          <button type="button" className="leave-type-back-link" onClick={goBackToList}>
            Leave Types
          </button>
        </div>

        <div className="leave-type-tabs">
          {tabConfig.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeTab === item.id ? 'leave-type-tab active' : 'leave-type-tab'}
              onClick={() => openDetail(id, item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {formError && <div className="settings-error">{formError}</div>}
        {isSelectedError && <div className="settings-error">{getErrorMessage(selectedError)}</div>}

        {isSelectedLoading ? (
          <div className="settings-empty">Loading leave type...</div>
        ) : !selectedLeaveType ? (
          <div className="settings-empty">Leave type not found.</div>
        ) : (
          <form className="leave-type-detail-card" onSubmit={handleUpdateSubmit}>
            {activeTab === 'general' ? (
              <>
                <div className="leave-type-detail-title">Edit Leave Type :</div>
                <div className="leave-type-form-grid">
                  <label className="leave-type-field">
                    <span>Type</span>
                    <input
                      type="text"
                      name="name"
                      value={detailForm.name}
                      onChange={handleDetailChange}
                      required
                    />
                  </label>
                  <label className="leave-type-field">
                    <span>Code</span>
                    <input
                      type="text"
                      name="code"
                      value={detailForm.code}
                      onChange={handleDetailChange}
                      required
                    />
                  </label>
                  <label className="leave-type-field">
                    <span>Total Leaves</span>
                    <input
                      type="number"
                      min="0"
                      name="totalLeaves"
                      value={detailForm.totalLeaves}
                      onChange={handleDetailChange}
                      required
                    />
                  </label>
                </div>
              </>
            ) : (
              <>
                <div className="leave-type-restriction-copy">
                  Allowed durations for this leave policy are :
                </div>

                <label className="leave-type-check">
                  <input
                    type="checkbox"
                    name="carryForward"
                    checked={detailForm.carryForward}
                    onChange={handleDetailChange}
                  />
                  <span>Carry Forward</span>
                </label>

                <div className="leave-type-form-grid leave-type-form-grid-restrictions">
                  <label className="leave-type-field">
                    <span>Maximum Leave Limit</span>
                    <input
                      type="number"
                      min="0"
                      name="maximumLeaveLimit"
                      value={detailForm.maximumLeaveLimit}
                      onChange={handleDetailChange}
                    />
                  </label>
                </div>

                <div className="leave-type-inline-row">
                  <span>Every</span>
                  <select
                    name="totalMonths"
                    value={detailForm.totalMonths}
                    onChange={handleDetailChange}
                  >
                    <option value="1">1 Month</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months</option>
                  </select>
                  <span>number of</span>
                  <input
                    type="number"
                    min="0"
                    name="monthlyCarryForward"
                    value={detailForm.monthlyCarryForward}
                    onChange={handleDetailChange}
                  />
                  <span>leaves add to the employee account.</span>
                </div>

                <label className="leave-type-check">
                  <input
                    type="checkbox"
                    name="isShortLeaveAllowed"
                    checked={detailForm.isShortLeaveAllowed}
                    onChange={handleDetailChange}
                  />
                  <span>Short Leave</span>
                </label>

                <label className="leave-type-check">
                  <input
                    type="checkbox"
                    name="isHalfDayLeaveAllowed"
                    checked={detailForm.isHalfDayLeaveAllowed}
                    onChange={handleDetailChange}
                  />
                  <span>Half Day Leave</span>
                </label>
              </>
            )}

            <div className="leave-type-detail-actions">
              <button type="button" className="ghost" onClick={goBackToList}>
                Cancel
              </button>
              <button type="submit" disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Update'}
              </button>
            </div>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="settings-panel leave-types-panel">
      <div className="leave-types-header">
        <div>
          <h2>Leave Types</h2>
        </div>
        <button type="button" onClick={() => setIsAddOpen(true)}>
          Add leave Type
        </button>
      </div>
      <div className="leave-types-note">
        <strong>Leave Code:</strong> Casual Leave = CL, Paid Leave = PL, Medical Leave = ML,
        Maternity Leave = MAT, Paternity Leave = PAT, Earned Leave = EL, Compensatory Leave = CTL
      </div>

      {formError && <div className="settings-error">{formError}</div>}
      {isError && <div className="settings-error">{getErrorMessage(error)}</div>}

      <div className="leave-types-grid">
        {isLoading ? (
          <div className="settings-empty">Loading...</div>
        ) : sortedItems.length === 0 ? (
          <div className="settings-empty">No leave types added yet.</div>
        ) : (
          sortedItems.map((item, index) => (
            <div
              key={item.id}
              className="leave-type-card leave-type-card-clickable"
              onClick={() => openDetail(item.id, 'general')}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  openDetail(item.id, 'general')
                }
              }}
            >
              <div className="leave-type-top">
                <div className="leave-type-index">{index + 1}</div>
                <span className="leave-type-name">{item.name}</span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleDelete(item.id)
                  }}
                  disabled={isDeleting}
                  aria-label="Delete leave type"
                >
                  <i className="pi pi-trash" />
                </button>
              </div>
              <div className="leave-type-code">{getAvatarText(item)}</div>
              <div className="leave-type-footer">
                <span>Total Leaves</span>
                <strong>{item.totalLeaves ?? 0}</strong>
              </div>
              <div className="leave-type-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={(event) => {
                    event.stopPropagation()
                    openDetail(item.id, 'general')
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isAddOpen && (
        <div className="modal-backdrop" onClick={closeAddModal}>
          <div className="modal leave-type-create-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Add Leave Type</h3>
            <p>Create the leave type first. You can edit restrictions after opening the detail page.</p>
            <form onSubmit={handleCreateSubmit}>
              <input
                type="text"
                name="name"
                value={createForm.name}
                onChange={handleCreateChange}
                placeholder="Leave type name"
                required
              />
              <input
                type="text"
                name="code"
                value={createForm.code}
                onChange={handleCreateChange}
                placeholder="Code"
                required
              />
              <input
                type="number"
                min="0"
                name="totalLeaves"
                value={createForm.totalLeaves}
                onChange={handleCreateChange}
                placeholder="Total leaves"
                required
              />
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={closeAddModal}>
                  Cancel
                </button>
                <button type="submit" disabled={isCreating}>
                  {isCreating ? 'Saving...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default LeaveTypeManager
