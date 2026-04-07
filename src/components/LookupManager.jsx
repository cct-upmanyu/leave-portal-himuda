import { useState } from 'react'
import {
  useCreateLookupMutation,
  useDeleteLookupMutation,
  useGetLookupsQuery,
  useUpdateLookupMutation,
} from '../redux/api/lookupApi'
import '../styles/Settings.css'

const getErrorMessage = (err) => {
  return err?.data?.error || err?.error || 'Something went wrong.'
}

function LookupManager({ table, title }) {
  const { data, isLoading, isError, error } = useGetLookupsQuery(table)
  const [createLookup, { isLoading: isCreating }] = useCreateLookupMutation()
  const [updateLookup, { isLoading: isUpdating }] = useUpdateLookupMutation()
  const [deleteLookup, { isLoading: isDeleting }] = useDeleteLookupMutation()

  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null)

  const items = data?.data || []

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setFormError('Name is required.')
      return
    }
    setFormError('')
    try {
      await createLookup({ table, name: name.trim() }).unwrap()
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
    setOpenMenuId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
    setIsEditOpen(false)
    setOpenMenuId(null)
  }

  const saveEdit = async () => {
    if (!editingName.trim()) {
      setFormError('Name is required.')
      return
    }
    setFormError('')
    try {
      await updateLookup({ table, id: editingId, name: editingName.trim() }).unwrap()
      cancelEdit()
    } catch (err) {
      setFormError(getErrorMessage(err))
    }
  }

  const handleDelete = async (id) => {
    try {
      if (!window.confirm('Are you sure you want to delete this record?')) {
        return
      }
      setOpenMenuId(null)
      await deleteLookup({ table, id }).unwrap()
    } catch (err) {
      setFormError(getErrorMessage(err))
    }
  }

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>{title}</h2>
        <p>Manage master data for {title.toLowerCase()}.</p>
      </div>

      <div className="settings-form">
        <button type="button" onClick={() => setIsAddOpen(true)}>
          Add {title}
        </button>
      </div>
      {formError && <div className="settings-error">{formError}</div>}
      {isError && <div className="settings-error">{getErrorMessage(error)}</div>}

      <div className="settings-table table-2">
        <div className="settings-table-head">
          <div>Sr. No.</div>
          <div>Name</div>
          <div className="settings-actions-col">Action</div>
        </div>
        <div className="settings-table-body">
          {isLoading ? (
            <div className="settings-empty">Loading...</div>
          ) : items.length === 0 ? (
            <div className="settings-empty">No records yet.</div>
          ) : (
            items.map((item, index) => (
              <div key={item.id} className="settings-table-row">
                {editingId === item.id ? (
                  <>
                    <div>{index + 1}</div>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                    />
                    <div className="settings-actions">
                      <button type="button" onClick={saveEdit} disabled={isUpdating}>
                        Save
                      </button>
                      <button type="button" className="ghost" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>{index + 1}</div>
                    <span>{item.name}</span>
                    <div className="settings-actions">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() =>
                          setOpenMenuId((prev) => (prev === item.id ? null : item.id))
                        }
                      >
                        <i className="pi pi-ellipsis-v" />
                      </button>
                      {openMenuId === item.id && (
                        <div className="settings-menu-popup">
                          <button type="button" onClick={() => startEdit(item)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleDelete(item.id)}
                            disabled={isDeleting}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {isAddOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add {title}</h3>
            <p>Enter a name to create a new record.</p>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`New ${title} name`}
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
            <h3>Edit {title}</h3>
            <p>Update the name and save changes.</p>
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              placeholder={`Edit ${title} name`}
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

export default LookupManager
