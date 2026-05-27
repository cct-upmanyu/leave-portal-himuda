import { useMemo, useState } from 'react'
import {
  useCreateLookupMutation,
  useDeleteLookupMutation,
  useGetLookupsQuery,
  useUpdateLookupMutation,
} from '../redux/api/lookupApi'
import PaginationControls from './PaginationControls'
import usePagination from '../utils/usePagination'
import '../styles/Settings.css'

const getErrorMessage = (err) => {
  return err?.data?.error || err?.error || 'Something went wrong.'
}

function LookupManager({ table, title }) {
  const { data, isLoading, isError, error } = useGetLookupsQuery(table)
  const { data: divisionsData } = useGetLookupsQuery('divisions', {
    skip: table !== 'sub_divisions',
  })
  const [createLookup, { isLoading: isCreating }] = useCreateLookupMutation()
  const [updateLookup, { isLoading: isUpdating }] = useUpdateLookupMutation()
  const [deleteLookup, { isLoading: isDeleting }] = useDeleteLookupMutation()

  const [name, setName] = useState('')
  const [division, setDivision] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [editingDivision, setEditingDivision] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const items = isError ? [] : data?.data || []
  const divisions = divisionsData?.data || []
  const divisionMap = new Map(divisions.map((item) => [String(item.id), item.name]))
  const isSubDivisionTable = table === 'sub_divisions'
  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return items

    return items.filter((item) =>
      [
        item.name,
        item.division_name,
        divisionMap.get(String(item.division || '')) || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [divisionMap, items, searchTerm])
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
    resetDeps: [table, searchTerm],
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setFormError('Name is required.')
      return
    }
    if (isSubDivisionTable && !division) {
      setFormError('Division is required.')
      return
    }
    setFormError('')
    try {
      await createLookup({
        table,
        name: name.trim(),
        ...(isSubDivisionTable ? { division } : {}),
      }).unwrap()
      setName('')
      setDivision('')
      setIsAddOpen(false)
    } catch (err) {
      setFormError(getErrorMessage(err))
    }
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditingName(item.name)
    setEditingDivision(item.division || '')
    setIsEditOpen(true)
    setOpenMenuId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
    setEditingDivision('')
    setIsEditOpen(false)
    setOpenMenuId(null)
  }

  const saveEdit = async () => {
    if (!editingName.trim()) {
      setFormError('Name is required.')
      return
    }
    if (isSubDivisionTable && !editingDivision) {
      setFormError('Division is required.')
      return
    }
    setFormError('')
    try {
      await updateLookup({
        table,
        id: editingId,
        name: editingName.trim(),
        ...(isSubDivisionTable ? { division: editingDivision } : {}),
      }).unwrap()
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
        <div className="settings-search">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${title}`}
          />
          <button type="button">Search</button>
        </div>
        <button type="button" onClick={() => setIsAddOpen(true)}>
          Add {title}
        </button>
      </div>
      {formError && <div className="settings-error">{formError}</div>}
      {isError && <div className="settings-error">{getErrorMessage(error)}</div>}

      <div className={`settings-table ${isSubDivisionTable ? 'table-3' : 'table-2'}`}>
        <div className="settings-table-head">
          <div>Sr. No.</div>
          <div>Name</div>
          {isSubDivisionTable ? <div>Division</div> : null}
          <div className="settings-actions-col">Action</div>
        </div>
        <div className="settings-table-body">
          {isLoading ? (
            <div className="settings-empty">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="settings-empty">
              {searchTerm ? 'No matching records found.' : 'No records yet.'}
            </div>
          ) : (
            paginatedItems.map((item, index) => (
              <div key={item.id} className="settings-table-row">
                {editingId === item.id ? (
                  <>
                    <div>{startIndex + index + 1}</div>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                    />
                    {isSubDivisionTable ? (
                      <select value={editingDivision} onChange={(e) => setEditingDivision(e.target.value)}>
                        <option value="">Select Division</option>
                        {divisions.map((divisionItem) => (
                          <option key={divisionItem.id} value={divisionItem.id}>
                            {divisionItem.name}
                          </option>
                        ))}
                      </select>
                    ) : null}
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
                    <div>{startIndex + index + 1}</div>
                    <span>{item.name}</span>
                    {isSubDivisionTable ? <span>{item.division_name || divisionMap.get(String(item.division || '')) || '-'}</span> : null}
                    <div className="settings-action-menu" onClick={(e) => e.stopPropagation()}>
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
      <PaginationControls
        currentPage={currentPage}
        endItem={endItem}
        onPageChange={setCurrentPage}
        startItem={startItem}
        totalItems={totalItems}
        totalPages={totalPages}
      />

      {isAddOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add {title}</h3>
            <p>
              {isSubDivisionTable
                ? 'Provide the sub division name and choose its parent division.'
                : 'Enter a name to create a new record.'}
            </p>
            <form onSubmit={handleSubmit}>
              <div className="modal-form">
                <label className="modal-field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`${title} name`}
                  />
                </label>
                {isSubDivisionTable ? (
                  <label className="modal-field">
                    <span>Division</span>
                    <select value={division} onChange={(e) => setDivision(e.target.value)}>
                      <option value="">Select Division</option>
                      {divisions.map((divisionItem) => (
                        <option key={divisionItem.id} value={divisionItem.id}>
                          {divisionItem.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
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
        <div className="modal-backdrop" onClick={cancelEdit}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit {title}</h3>
            <p>
              {isSubDivisionTable
                ? 'Update the sub division name and parent division.'
                : 'Update the name and save changes.'}
            </p>
            <div className="modal-form">
              <label className="modal-field">
                <span>Name</span>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder={`${title} name`}
                />
              </label>
              {isSubDivisionTable ? (
                <label className="modal-field">
                  <span>Division</span>
                  <select value={editingDivision} onChange={(e) => setEditingDivision(e.target.value)}>
                    <option value="">Select Division</option>
                    {divisions.map((divisionItem) => (
                      <option key={divisionItem.id} value={divisionItem.id}>
                        {divisionItem.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
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
