import { useState } from 'react'
import { Calendar } from 'primereact/calendar'
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

const toDateObject = (value) => {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const raw = value.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [year, month, day] = raw.split('-').map(Number)
      const parsed = new Date(year, month - 1, day)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const toApiDate = (value) => {
  if (!value) return ''
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return value
}

const formatDate = (value) => {
  const date = toDateObject(value)
  if (!date) return '-'
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function AnnouncementManager() {
  const { data, isLoading, isError, error } = useGetNotificationsQuery()
  const [createNotification, { isLoading: isCreating }] = useCreateNotificationMutation()
  const [updateNotification, { isLoading: isUpdating }] = useUpdateNotificationMutation()
  const [deleteNotification, { isLoading: isDeleting }] = useDeleteNotificationMutation()

  const items = data?.data || []

  const [formState, setFormState] = useState({ title: '', url: '', endDate: null })
  const [editingId, setEditingId] = useState(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null)

  const resetForm = () => {
    setFormState({ title: '', url: '', endDate: null })
    setFormError('')
  }

  const openAdd = () => {
    resetForm()
    setIsAddOpen(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setFormState({ title: item.title || '', url: item.url || '', endDate: toDateObject(item.endDate) })
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
    if (!formState.endDate) return 'Expiry date is required.'
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
        endDate: toApiDate(formState.endDate),
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
        endDate: toApiDate(formState.endDate),
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

      <div className="settings-table table-4">
        <div className="settings-table-head">
          <div>Sr. No.</div>
          <div>Announcement</div>
          <div>URL</div>
          <div>Expiry Date</div>
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
                <div>{formatDate(item.endDate)}</div>
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
            <p>Provide the announcement text, link, and expiry date.</p>
            <form onSubmit={handleSubmit}>
              <div className="modal-form">
                <label className="modal-field">
                  <span>Announcement</span>
                  <input
                    type="text"
                    value={formState.title}
                    onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Announcement"
                  />
                </label>
                <label className="modal-field">
                  <span>URL</span>
                  <input
                    type="text"
                    value={formState.url}
                    onChange={(e) => setFormState((prev) => ({ ...prev, url: e.target.value }))}
                    placeholder="URL"
                  />
                </label>
                <label className="modal-field">
                  <span>Expiry Date</span>
                  <Calendar
                    value={formState.endDate}
                    onChange={(e) => setFormState((prev) => ({ ...prev, endDate: e.value }))}
                    dateFormat="dd M yy"
                    minDate={new Date()}
                    showIcon
                    className="modal-calendar"
                  />
                </label>
              </div>
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
            <p>Update the announcement, URL, and expiry date.</p>
            <div className="modal-form">
              <label className="modal-field">
                <span>Announcement</span>
                <input
                  type="text"
                  value={formState.title}
                  onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Announcement"
                />
              </label>
              <label className="modal-field">
                <span>URL</span>
                <input
                  type="text"
                  value={formState.url}
                  onChange={(e) => setFormState((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="URL"
                />
              </label>
              <label className="modal-field">
                <span>Expiry Date</span>
                <Calendar
                  value={formState.endDate}
                  onChange={(e) => setFormState((prev) => ({ ...prev, endDate: e.value }))}
                  dateFormat="dd M yy"
                  minDate={new Date()}
                  showIcon
                  className="modal-calendar"
                />
              </label>
            </div>
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
