import { useState } from 'react'
import {
  useCreateNotificationMutation,
  useDeleteNotificationMutation,
  useGetNotificationsQuery,
  useUpdateNotificationMutation,
} from '../redux/api/notificationApi'
import '../styles/Settings.css'

const getErrorMessage = (err) => {
  return err?.data?.error || err?.error || 'Something went wrong.'
}

function AnnouncementManager() {
  const { data, isLoading, isError, error } = useGetNotificationsQuery()
  const [createNotification, { isLoading: isCreating }] = useCreateNotificationMutation()
  const [updateNotification, { isLoading: isUpdating }] = useUpdateNotificationMutation()
  const [deleteNotification, { isLoading: isDeleting }] = useDeleteNotificationMutation()

  const items = data?.data || []

  const [formState, setFormState] = useState({ title: '', url: '' })
  const [editingId, setEditingId] = useState(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null)

  const resetForm = () => {
    setFormState({ title: '', url: '' })
    setFormError('')
  }

  const openAdd = () => {
    resetForm()
    setIsAddOpen(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setFormState({ title: item.title || '', url: item.url || '' })
    setFormError('')
    setIsEditOpen(true)
    setOpenMenuId(null)
  }

  const closeEdit = () => {
    setEditingId(null)
    setIsEditOpen(false)
    resetForm()
    setOpenMenuId(null)
  }

  const validateForm = () => {
    if (!formState.title.trim()) return 'Announcement is required.'
    if (!formState.url.trim()) return 'URL is required.'
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validation = validateForm()
    if (validation) {
      setFormError(validation)
      return
    }
    setFormError('')
    try {
      await createNotification({
        title: formState.title.trim(),
        url: formState.url.trim(),
      }).unwrap()
      setIsAddOpen(false)
      resetForm()
    } catch (err) {
      setFormError(getErrorMessage(err))
    }
  }

  const handleUpdate = async () => {
    const validation = validateForm()
    if (validation) {
      setFormError(validation)
      return
    }
    setFormError('')
    try {
      await updateNotification({
        id: editingId,
        title: formState.title.trim(),
        url: formState.url.trim(),
      }).unwrap()
      closeEdit()
    } catch (err) {
      setFormError(getErrorMessage(err))
    }
  }

  const handleDelete = async (id) => {
    try {
      if (!window.confirm('Are you sure you want to delete this announcement?')) {
        return
      }
      setOpenMenuId(null)
      await deleteNotification(id).unwrap()
    } catch (err) {
      setFormError(getErrorMessage(err))
    }
  }

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Announcements</h2>
        <p>Publish announcement messages with a target URL.</p>
      </div>

      <div className="settings-form">
        <button type="button" onClick={openAdd}>
          Add Announcement
        </button>
      </div>
      {formError && <div className="settings-error">{formError}</div>}
      {isError && <div className="settings-error">{getErrorMessage(error)}</div>}

      <div className="settings-table table-3">
        <div className="settings-table-head">
          <div>Sr. No.</div>
          <div>Announcement</div>
          <div>URL</div>
          <div className="settings-actions-col">Action</div>
        </div>
        <div className="settings-table-body">
          {isLoading ? (
            <div className="settings-empty">Loading...</div>
          ) : items.length === 0 ? (
            <div className="settings-empty">No announcements yet.</div>
          ) : (
            items.map((item, index) => (
              <div key={item.id} className="settings-table-row">
                <div>{index + 1}</div>
                <div className="settings-cell-strong">{item.title}</div>
                <a className="settings-link-inline" href={item.url} target="_blank" rel="noreferrer">
                  {item.url}
                </a>
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
                      <button type="button" onClick={() => openEdit(item)}>
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
              </div>
            ))
          )}
        </div>
      </div>

      {isAddOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Announcement</h3>
            <p>Provide the announcement text and link.</p>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={formState.title}
                onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Announcement"
              />
              <input
                type="text"
                value={formState.url}
                onChange={(e) => setFormState((prev) => ({ ...prev, url: e.target.value }))}
                placeholder="URL"
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
        <div className="modal-backdrop" onClick={closeEdit}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Announcement</h3>
            <p>Update the announcement and URL.</p>
            <input
              type="text"
              value={formState.title}
              onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Announcement"
            />
            <input
              type="text"
              value={formState.url}
              onChange={(e) => setFormState((prev) => ({ ...prev, url: e.target.value }))}
              placeholder="URL"
            />
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={closeEdit}>
                Cancel
              </button>
              <button type="button" onClick={handleUpdate} disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnnouncementManager
