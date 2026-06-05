import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  useCreateLeaveTypeMutation,
  useDeleteLeaveTypeMutation,
  useGetLeaveTypeByIdQuery,
  useGetLeaveTypesQuery,
  useUpdateLeaveTypeMutation,
} from '../redux/api/leaveTypeApi'
import ConfirmDialog from './ConfirmDialog'
import PaginationControls from './PaginationControls'
import usePagination from '../utils/usePagination'
import '../styles/Settings.css'

const emptyForm = {
  name: '',
  code: '',
  totalLeaves: 0,
  carryForward: false,
  maximumLeaveLimit: 0,
  isShortLeaveAllowed: false,
  isHalfDayLeaveAllowed: false,
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
  carryForward: Boolean(item?.carryForward),
  maximumLeaveLimit: item?.maximumLeaveLimit ?? 0,
  isShortLeaveAllowed: Boolean(item?.isShortLeaveAllowed),
  isHalfDayLeaveAllowed: Boolean(item?.isHalfDayLeaveAllowed),
})

const buildLeaveTypePayload = (form) => ({
  name: form.name,
  code: form.code,
  totalLeaves: Number(form.totalLeaves) || 0,
  carryForward: Boolean(form.carryForward),
  maximumLeaveLimit: Number(form.maximumLeaveLimit) || 0,
  isShortLeaveAllowed: Boolean(form.isShortLeaveAllowed),
  isHalfDayLeaveAllowed: Boolean(form.isHalfDayLeaveAllowed),
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
  const [openMenuId, setOpenMenuId] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (selectedLeaveType) {
      setDetailForm(toFormState(selectedLeaveType))
      setFormError('')
    }
  }, [selectedLeaveType])

  const sortedItems = useMemo(() => items.slice().sort((a, b) => a.name.localeCompare(b.name)), [items])
  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return sortedItems

    return sortedItems.filter((item) =>
      [item.name, item.code, item.totalLeaves, item.maximumLeaveLimit]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [searchTerm, sortedItems])
  const {
    currentPage,
    endItem,
    paginatedItems,
    setCurrentPage,
    startIndex,
    startItem,
    totalItems,
    totalPages,
  } = usePagination(filteredItems, {
    resetDeps: [searchTerm],
  })

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
      const created = await createLeaveType(buildLeaveTypePayload(createForm)).unwrap()
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
      await updateLeaveType({ id, ...buildLeaveTypePayload(detailForm) }).unwrap()
    } catch (err) {
      setFormError(getErrorMessage(err))
    }
  }

  const handleDelete = (item) => {
    setOpenMenuId(null)
    setDeleteItem(item)
  }

  const closeDelete = () => {
    setDeleteItem(null)
  }

  const confirmDelete = async () => {
    if (!deleteItem?.id) return

    try {
      await deleteLeaveType(deleteItem.id).unwrap()
      if (String(id || '') === String(deleteItem.id)) {
        goBackToList()
      }
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setDeleteItem(null)
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
                  Configure balance rules and applicable leave formats for this leave type.
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
        <div className="settings-form">
          <div className="settings-search">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search Leave Types"
            />
            <button type="button">Search</button>
          </div>
          <button type="button" onClick={() => setIsAddOpen(true)}>
            Add leave Type
          </button>
        </div>
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
        ) : filteredItems.length === 0 ? (
          <div className="settings-empty">
            {searchTerm ? 'No matching leave types found.' : 'No leave types added yet.'}
          </div>
        ) : (
          paginatedItems.map((item, index) => (
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
                <div className="leave-type-index">{startIndex + index + 1}</div>
                <span className="leave-type-name">{item.name}</span>
                <div className="settings-action-menu" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    className="settings-menu-trigger"
                    onClick={() =>
                      setOpenMenuId((prev) => (prev === item.id ? null : item.id))
                    }
                    aria-label={`Open actions for ${item.name}`}
                  >
                    <span />
                    <span />
                    <span />
                  </button>
                  {openMenuId === item.id && (
                    <div className="settings-menu-popup">
                      <button type="button" onClick={() => openDetail(item.id, 'general')}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleDelete(item)}
                        disabled={isDeleting}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="leave-type-code">{getAvatarText(item)}</div>
              <div className="leave-type-footer">
                <span>Total Leaves</span>
                <strong>{item.totalLeaves ?? 0}</strong>
              </div>
            </div>
          ))
        )}
      </div>
      <PaginationControls
        currentPage={currentPage}
        endItem={endItem}
        onPageChange={setCurrentPage}
        startItem={startItem}
        totalItems={totalItems}
        totalPages={totalPages}
      />

      <ConfirmDialog
        open={Boolean(deleteItem)}
        title="Delete Leave Type"
        description="This leave type will be removed from the system."
        onCancel={closeDelete}
        onConfirm={confirmDelete}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        confirmClassName="danger"
        isLoading={isDeleting}
      >
        <div className="confirm-dialog-summary">
          <strong>{deleteItem?.name || 'This leave type'}</strong>
          <span>{deleteItem?.code || '-'}</span>
          <p>Are you sure you want to delete this leave type?</p>
        </div>
      </ConfirmDialog>

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
