import { useMemo, useState } from 'react'
import { useGetActivityLogsQuery } from '../redux/api/activityLogApi'
import { useGetEmployeesQuery } from '../redux/api/employeeApi'
import PaginationControls from '../components/PaginationControls'
import usePagination from '../utils/usePagination'
import '../styles/ActivityLogs.css'

const formatDateTime = (value) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatJson = (value) => {
  if (value == null) return 'No data'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const getEmployeeUserId = (employee) =>
  String(employee?.emp_id || employee?.employeeUserId || employee?.rowid || employee?.id || '')

const getEmployeeFullName = (employee) => {
  if (!employee) return ''
  const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(' ').trim()
  return fullName || employee.user_name || employee.email || ''
}

const shouldResolveNameKey = (key) =>
  /(actor.*id|related.*id|user.*id|employee.*id|emp.*id)$/i.test(String(key || ''))

const resolveEmployeeName = (value, employeeNameMap) => {
  const normalized = String(value || '').trim()
  if (!normalized) return ''
  return employeeNameMap.get(normalized) || ''
}

const getDisplayEntityId = (log, employeeNameMap) => {
  if (!log) return '-'

  const metadata = log.metadata && typeof log.metadata === 'object' ? log.metadata : {}
  const resolvedEmployeeName =
    log.targetName ||
    resolveEmployeeName(log.entityId, employeeNameMap) ||
    resolveEmployeeName(metadata.employeeDetailId, employeeNameMap) ||
    resolveEmployeeName(metadata.emp_id, employeeNameMap)

  if (resolvedEmployeeName) {
    return resolvedEmployeeName
  }

  return log.entityId || metadata.entity_rowid || '-'
}

const enrichMetadataWithNames = (value, employeeNameMap) => {
  if (Array.isArray(value)) {
    return value.map((item) => enrichMetadataWithNames(item, employeeNameMap))
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, currentValue]) => {
      if (currentValue && typeof currentValue === 'object') {
        return [key, enrichMetadataWithNames(currentValue, employeeNameMap)]
      }

      if (shouldResolveNameKey(key)) {
        const resolvedName = resolveEmployeeName(currentValue, employeeNameMap)
        return [key, resolvedName || currentValue]
      }

      return [key, currentValue]
    }),
  )
}

function ActivityLogs() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)
  const { data: employeesData } = useGetEmployeesQuery()

  const params = useMemo(
    () => ({
      limit: 100,
    }),
    [],
  )

  const { data, isLoading, error } = useGetActivityLogsQuery(params)
  const logs = data?.data || []
  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return logs

    return logs.filter((log) =>
      [
        formatDateTime(log.createdAt),
        log.moduleName,
        log.actionLabel,
        log.actionType,
        log.actorName,
        log.targetName,
        log.entityId,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [logs, searchTerm])
  const {
    currentPage,
    endItem,
    paginatedItems,
    setCurrentPage,
    startItem,
    totalItems,
    totalPages,
  } = usePagination(filteredLogs, {
    resetDeps: [searchTerm],
  })
  const employees = employeesData?.data || []
  const employeeNameMap = useMemo(() => {
    const map = new Map()

    employees.forEach((employee) => {
      const name = getEmployeeFullName(employee)
      if (!name) return

      ;[
        employee?.emp_id,
        employee?.employeeUserId,
        employee?.rowid,
        employee?.id,
        getEmployeeUserId(employee),
      ]
        .filter(Boolean)
        .forEach((key) => {
          map.set(String(key), name)
        })
    })

    return map
  }, [employees])
  const selectedLogMetadata = useMemo(
    () => enrichMetadataWithNames(selectedLog?.metadata, employeeNameMap),
    [employeeNameMap, selectedLog?.metadata],
  )
  const selectedActorName =
    selectedLog?.actorName ||
    resolveEmployeeName(selectedLog?.actorUserId, employeeNameMap) ||
    '-'
  const selectedRelatedUserName =
    resolveEmployeeName(selectedLog?.relatedUserId, employeeNameMap) ||
    selectedLog?.relatedUserId ||
    '-'
  const selectedEntityName =
    selectedLog?.targetName ||
    resolveEmployeeName(selectedLog?.entityId, employeeNameMap) ||
    selectedLog?.entityId ||
    '-'
  const selectedEntityDisplayId = getDisplayEntityId(selectedLog, employeeNameMap)

  return (
    <div className="settings-panel activity-log-panel">
      <div className="settings-header">
        <h2>Activity Logs</h2>
        <p>Admin audit trail for create, update, delete, approval, rejection, and forwarding events.</p>
      </div>

      <div className="activity-log-filters">
        <label>
          <span>Search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search activity logs"
          />
        </label>
      </div>

      {error ? <div className="settings-error">{error?.data?.error || 'Failed to load activity logs.'}</div> : null}

      <div className="activity-log-table">
        <div className="activity-log-table-head">
          <div>Time</div>
          <div>Module</div>
          <div>Action</div>
          <div>Actor</div>
          <div>Target</div>
        </div>
        <div className="activity-log-table-body">
          {isLoading ? (
            <div className="activity-log-empty">Loading activity logs...</div>
          ) : filteredLogs.length ? (
            paginatedItems.map((log) => (
              <button
                key={log.id}
                type="button"
                className="activity-log-row"
                onClick={() => setSelectedLog(log)}
              >
                <div>{formatDateTime(log.createdAt)}</div>
                <div>{log.moduleName || '-'}</div>
                <div>{log.actionLabel || log.actionType || '-'}</div>
                <div>{log.actorName || '-'}</div>
                <div>{log.targetName || log.entityId || '-'}</div>
              </button>
            ))
          ) : (
            <div className="activity-log-empty">
              {searchTerm ? 'No matching activity logs found.' : 'No activity logs available.'}
            </div>
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

      {selectedLog ? (
        <div className="activity-log-backdrop" onClick={() => setSelectedLog(null)}>
          <div className="activity-log-modal" onClick={(event) => event.stopPropagation()}>
            <div className="activity-log-modal-header">
              <div>
                <h3>{selectedLog.actionLabel || selectedLog.actionType || 'Activity Details'}</h3>
                <p>Full activity log details for this event.</p>
              </div>
              <button
                type="button"
                className="activity-log-close"
                onClick={() => setSelectedLog(null)}
              >
                x
              </button>
            </div>

            <div className="activity-log-detail-grid">
              <div>
                <span>Time</span>
                <strong>{formatDateTime(selectedLog.createdAt)}</strong>
              </div>
              <div>
                <span>Module</span>
                <strong>{selectedLog.moduleName || '-'}</strong>
              </div>
              <div>
                <span>Action</span>
                <strong>{selectedLog.actionLabel || selectedLog.actionType || '-'}</strong>
              </div>
              <div>
                <span>Actor</span>
                <strong>{selectedActorName}</strong>
              </div>
              <div>
                <span>Target</span>
                <strong>{selectedEntityName}</strong>
              </div>
              <div>
                <span>Entity Type</span>
                <strong>{selectedLog.entityType || '-'}</strong>
              </div>
              <div>
                <span>Entity ID</span>
                <strong>{selectedEntityDisplayId}</strong>
              </div>
              <div>
                <span>Actor User ID</span>
                <strong>{selectedActorName}</strong>
              </div>
              <div>
                <span>Actor Role ID</span>
                <strong>{selectedLog.actorRoleId || '-'}</strong>
              </div>
              <div>
                <span>Related User ID</span>
                <strong>{selectedRelatedUserName}</strong>
              </div>
            </div>

            <div className="activity-log-json-panels">
              <section className="activity-log-json-card">
                <h4>Before</h4>
                <pre>{formatJson(selectedLog.before)}</pre>
              </section>
              <section className="activity-log-json-card">
                <h4>After</h4>
                <pre>{formatJson(selectedLog.after)}</pre>
              </section>
              <section className="activity-log-json-card activity-log-json-card-full">
                <h4>Metadata</h4>
                <pre>{formatJson(selectedLogMetadata)}</pre>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default ActivityLogs
