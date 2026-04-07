import { useState } from 'react'
import {
  useCreateLeaveTypeMutation,
  useDeleteLeaveTypeMutation,
  useGetLeaveTypesQuery,
  useUpdateLeaveTypeMutation,
} from '../redux/api/leaveTypeApi'
import '../styles/Settings.css'

const getErrorMessage = (err) => {
  return err?.data?.error || err?.error || 'Something went wrong.'
}

function LeaveTypeManager() {
  const { data, isLoading, isError, error } = useGetLeaveTypesQuery()
  const [createLeaveType, { isLoading: isCreating }] = useCreateLeaveTypeMutation()
  const [updateLeaveType, { isLoading: isUpdating }] = useUpdateLeaveTypeMutation()
  const [deleteLeaveType, { isLoading: isDeleting }] = useDeleteLeaveTypeMutation()

  const items = data?.data || []

  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setFormError('Name is required.')
      return
    }
    setFormError('')
    try {
      await createLeaveType({ name: name.trim() }).unwrap()
      setName('')
      setIsAddOpen(false)
    } catch (err) {
      setFormError(getErrorMessage(err))
    }
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditingName(item.name)
    setIsEditOpen(true)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
    setIsEditOpen(false)
  }

  const saveEdit = async () => {
    if (!editingName.trim()) {
      setFormError('Name is required.')
      return
    }
    setFormError('')
    try {
      await updateLeaveType({ id: editingId, name: editingName.trim() }).unwrap()
      cancelEdit()
    } catch (err) {
      setFormError(getErrorMessage(err))
    }
  }

  const handleDelete = async (id) => {
    try {
      if (!window.confirm('Are you sure you want to delete this leave type?')) {
        return
      }
      await deleteLeaveType(id).unwrap()
    } catch (err) {
      setFormError(getErrorMessage(err))
    }
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
        ) : items.length === 0 ? (
          <div className="settings-empty">No leave types added yet.</div>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className="leave-type-card">
              <div className="leave-type-top">
                <div className="leave-type-index">{index + 1}</div>
                <span className="leave-type-name">{item.name}</span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => handleDelete(item.id)}
                  disabled={isDeleting}
                  aria-label="Delete leave type"
                >
                  <i className="pi pi-trash" />
                </button>
              </div>
              <div className="leave-type-code">
                {(item.name || '').split(' ').map((part) => part[0]).join('').slice(0, 3)}
              </div>
              <div className="leave-type-footer">
                <span>Total Leaves</span>
                <strong>{item.totalLeaves ?? 0}</strong>
              </div>
              <div className="leave-type-actions">
                <button type="button" className="ghost" onClick={() => startEdit(item)}>
                  Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isAddOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Leave Type</h3>
            <p>Enter a name to create a new leave type.</p>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Leave type name"
              />
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={() => setIsAddOpen(false)}>
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

      {isEditOpen && (
        <div className="modal-backdrop" onClick={cancelEdit}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Leave Type</h3>
            <p>Update the name and save changes.</p>
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              placeholder="Leave type name"
            />
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={cancelEdit}>
                Cancel
              </button>
              <button type="button" onClick={saveEdit} disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LeaveTypeManager
