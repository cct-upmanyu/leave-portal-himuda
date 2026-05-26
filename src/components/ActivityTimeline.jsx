import { useMemo } from 'react'
import { useGetActivityLogsQuery } from '../redux/api/activityLogApi'
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

function ActivityTimeline({
  title = 'Activity Timeline',
  description = 'Recent changes for this record.',
  moduleName,
  entityType,
  entityId,
  relatedUserId,
  refreshKey = 0,
  enabled = true,
  limit = 10,
  compact = false,
}) {
  const directParams = useMemo(
    () => ({
      module: moduleName,
      entityType,
      entityId,
      limit,
      refreshKey,
    }),
    [entityId, entityType, limit, moduleName, refreshKey],
  )

  const relatedParams = useMemo(
    () => ({
      relatedUserId,
      limit,
      refreshKey,
    }),
    [limit, refreshKey, relatedUserId],
  )

  const { data: directData, isLoading: isDirectLoading } = useGetActivityLogsQuery(directParams, {
    skip: !enabled || !entityId,
  })
  const { data: relatedData, isLoading: isRelatedLoading } = useGetActivityLogsQuery(relatedParams, {
    skip: !enabled || !relatedUserId,
  })

  const logs = useMemo(() => {
    const merged = [...(directData?.data || []), ...(relatedData?.data || [])]
    const uniqueLogs = Array.from(new Map(merged.map((item) => [String(item.id), item])).values())
    return uniqueLogs
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
      .slice(0, limit)
  }, [directData?.data, limit, relatedData?.data])

  const isLoading = isDirectLoading || isRelatedLoading

  return (
    <section className={`activity-timeline-card ${compact ? 'activity-timeline-card-compact' : ''}`}>
      <div className="activity-timeline-head">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>

      {isLoading ? (
        <div className="activity-timeline-empty">Loading timeline...</div>
      ) : logs.length ? (
        <div className="activity-timeline-list">
          {logs.map((log) => (
            <article key={log.id} className="activity-timeline-item">
              <div className="activity-timeline-dot" />
              <div className="activity-timeline-body">
                <div className="activity-timeline-top">
                  <strong>{log.actionLabel || log.actionType || 'Activity updated'}</strong>
                  <span>{formatDateTime(log.createdAt)}</span>
                </div>
                <div className="activity-timeline-meta">
                  <span>{log.actorName || 'Unknown user'}</span>
                  <span>{log.targetName || log.entityId || '-'}</span>
                </div>
                {log.message ? <p>{log.message}</p> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="activity-timeline-empty">No activity recorded yet.</div>
      )}
    </section>
  )
}

export default ActivityTimeline
