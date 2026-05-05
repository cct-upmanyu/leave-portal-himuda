import { useEffect, useMemo, useState } from 'react'
import { Calendar } from 'primereact/calendar'
import { Dropdown } from 'primereact/dropdown'
import {
  useCreateHolidayMutation,
  useDeleteHolidayMutation,
  useGetHolidaysQuery,
  useUpdateHolidayMutation,
} from '../redux/api/holidayApi'
import { useGetLookupsQuery } from '../redux/api/lookupApi'
import '../styles/Settings.css'

const getErrorMessage = (err) => {
  return err?.data?.error || err?.error || 'Something went wrong.'
}

const getCurrentYear = () => new Date().getFullYear()

const getYearDate = (year, month = 0, day = 1) => new Date(year, month, day)

const toDateObject = (value) => {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const parts = value.split('-')
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number)
      const parsed = getYearDate(year, month - 1, day)
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
  if (!value) return '--'
  const dateObj = toDateObject(value)
  if (!dateObj) return value
  return dateObj.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

const alignDateToYear = (value, year) => {
  if (!value) return null
  const dateObj = toDateObject(value)
  if (!dateObj) return null
  return getYearDate(year, dateObj.getMonth(), dateObj.getDate())
}

function HolidayManager() {
  const [selectedYear, setSelectedYear] = useState(getCurrentYear)
  const { data, isLoading, isError, error } = useGetHolidaysQuery(selectedYear)
  const { data: typeData, isLoading: isTypeLoading } = useGetLookupsQuery('holiday_type')
  const [createHoliday, { isLoading: isCreating }] = useCreateHolidayMutation()
  const [updateHoliday, { isLoading: isUpdating }] = useUpdateHolidayMutation()
  const [deleteHoliday, { isLoading: isDeleting }] = useDeleteHolidayMutation()

  const items = data?.data || []
  const holidayTypes = typeData?.data || []

  const typeOptions = useMemo(
    () =>
      holidayTypes.map((type) => ({
        label: type.name,
        value: type.id,
      })),
    [holidayTypes],
  )

  const typeMap = useMemo(() => {
    const map = new Map()
    holidayTypes.forEach((type) => map.set(String(type.id), type.name))
    return map
  }, [holidayTypes])

  const [formState, setFormState] = useState({
    name: '',
    holidayTypeId: '',
    holidayDate: null,
  })
  const [editingId, setEditingId] = useState(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null)
  const yearMinDate = useMemo(() => getYearDate(selectedYear, 0, 1), [selectedYear])
  const yearMaxDate = useMemo(() => getYearDate(selectedYear, 11, 31), [selectedYear])
  const yearViewDate = useMemo(() => getYearDate(selectedYear, 0, 1), [selectedYear])

  useEffect(() => {
    setOpenMenuId(null)
    setFormError('')
    setFormState((prev) => ({
      ...prev,
      holidayDate: alignDateToYear(prev.holidayDate, selectedYear),
    }))
  }, [selectedYear])

  const resetForm = () => {
    setFormState({ name: '', holidayTypeId: '', holidayDate: null })
    setFormError('')
  }

  const openAdd = () => {
    resetForm()
    setIsAddOpen(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setFormState({
      name: item.name || '',
      holidayTypeId: item.holidayTypeId ? String(item.holidayTypeId) : '',
      holidayDate: toDateObject(item.holidayDate),
    })
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
    if (!formState.name.trim()) {
      return 'Name is required.'
    }
    if (!formState.holidayTypeId) {
      return 'Type is required.'
    }
    if (!formState.holidayDate) {
      return 'Date is required.'
    }
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
      await createHoliday({
        name: formState.name.trim(),
        holidayTypeId: formState.holidayTypeId,
        holidayDate: toApiDate(formState.holidayDate),
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
      await updateHoliday({
        id: editingId,
        name: formState.name.trim(),
        holidayTypeId: formState.holidayTypeId,
        holidayDate: toApiDate(formState.holidayDate),
      }).unwrap()
      closeEdit()
    } catch (err) {
      setFormError(getErrorMessage(err))
    }
  }

  const handleDelete = async (id) => {
    try {
      if (!window.confirm('Are you sure you want to delete this holiday?')) {
        return
      }
      setOpenMenuId(null)
      await deleteHoliday(id).unwrap()
    } catch (err) {
      setFormError(getErrorMessage(err))
    }
  }

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Holidays</h2>
        <p>Manage holidays, types, and dates for the calendar.</p>
      </div>

      <div className="settings-form">
        <div className="settings-year-switcher" aria-label="Holiday year selector">
          <button
            type="button"
            className="settings-year-nav"
            onClick={() => setSelectedYear((prev) => prev - 1)}
            aria-label="Show previous year"
          >
            <i className="pi pi-angle-left" />
          </button>
          <span className="settings-year-value">{selectedYear}</span>
          <button
            type="button"
            className="settings-year-nav"
            onClick={() => setSelectedYear((prev) => prev + 1)}
            aria-label="Show next year"
          >
            <i className="pi pi-angle-right" />
          </button>
        </div>
        <button type="button" onClick={openAdd}>
          Add Holiday
        </button>
      </div>
      {formError && <div className="settings-error">{formError}</div>}
      {isError && <div className="settings-error">{getErrorMessage(error)}</div>}

      <div className="settings-table table-4">
        <div className="settings-table-head">
          <div>Sr. No.</div>
          <div>Name</div>
          <div>Type</div>
          <div>Date</div>
          <div className="settings-actions-col">Action</div>
        </div>
        <div className="settings-table-body">
          {isLoading ? (
            <div className="settings-empty">Loading...</div>
          ) : items.length === 0 ? (
            <div className="settings-empty">No holidays added for {selectedYear}.</div>
          ) : (
            items.map((item, index) => (
              <div key={item.id} className="settings-table-row">
                <div>{index + 1}</div>
                <div className="settings-cell-strong">{item.name}</div>
                <div>{typeMap.get(String(item.holidayTypeId)) || 'Unknown type'}</div>
                <div>{formatDate(item.holidayDate)}</div>
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
            <h3>Add Holiday</h3>
            <p>Provide holiday details to add it to the calendar.</p>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={formState.name}
                onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Holiday name"
              />
              <Dropdown
                value={formState.holidayTypeId}
                options={typeOptions}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, holidayTypeId: e.value }))
                }
                placeholder={isTypeLoading ? 'Loading types...' : 'Select holiday type'}
                className="modal-dropdown"
              />
              <Calendar
                value={formState.holidayDate}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, holidayDate: e.value }))
                }
                dateFormat="dd M yy"
                minDate={yearMinDate}
                maxDate={yearMaxDate}
                viewDate={yearViewDate}
                showIcon
                className="modal-calendar"
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
            <h3>Edit Holiday</h3>
            <p>Update the holiday details and save.</p>
            <input
              type="text"
              value={formState.name}
              onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Holiday name"
            />
            <Dropdown
              value={formState.holidayTypeId}
              options={typeOptions}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, holidayTypeId: e.value }))
              }
              placeholder={isTypeLoading ? 'Loading types...' : 'Select holiday type'}
              className="modal-dropdown"
            />
            <Calendar
              value={formState.holidayDate}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, holidayDate: e.value }))
              }
              dateFormat="dd M yy"
              minDate={yearMinDate}
              maxDate={yearMaxDate}
              viewDate={yearViewDate}
              showIcon
              className="modal-calendar"
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

export default HolidayManager
