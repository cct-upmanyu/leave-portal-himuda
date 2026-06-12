import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  useGetInternalNotificationsQuery,
  useGetUnreadInternalNotificationCountQuery,
  useMarkAllInternalNotificationsReadMutation,
  useMarkInternalNotificationReadMutation,
} from '../redux/api/internalNotificationApi'

const formatRelativeTime = (value) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''

  const deltaMinutes = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 60000))
  if (deltaMinutes < 1) return 'Just now'
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`

  const deltaHours = Math.floor(deltaMinutes / 60)
  if (deltaHours < 24) return `${deltaHours}h ago`

  const deltaDays = Math.floor(deltaHours / 24)
  if (deltaDays < 7) return `${deltaDays}d ago`

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const readStoredBadgeState = (key) => {
  if (typeof window === 'undefined') return { cachedCount: 0, snoozedCount: 0 }

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return { cachedCount: 0, snoozedCount: 0 }

    const parsed = JSON.parse(raw)
    return {
      cachedCount: Number.isFinite(Number(parsed?.cachedCount)) ? Number(parsed.cachedCount) : 0,
      snoozedCount: Number.isFinite(Number(parsed?.snoozedCount)) ? Number(parsed.snoozedCount) : 0,
    }
  } catch (error) {
    return { cachedCount: 0, snoozedCount: 0 }
  }
}

const writeStoredBadgeState = (key, value) => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    // ignore storage failures
  }
}

const NotificationBell = () => {
  const navigate = useNavigate()
  const panelRef = useRef(null)
  const user = useSelector((state) => state.auth.user)
  const pulseTimeoutRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isPulsing, setIsPulsing] = useState(false)
  const [badgeState, setBadgeState] = useState({ cachedCount: 0, snoozedCount: 0 })
  const [readNotification] = useMarkInternalNotificationReadMutation()
  const [readAllNotifications, { isLoading: isMarkingAllRead }] =
    useMarkAllInternalNotificationsReadMutation()
  const { data: notificationsData, isFetching } = useGetInternalNotificationsQuery(
    { limit: 25 },
    { refetchOnMountOrArgChange: true },
  )
  const { data: unreadCountData } = useGetUnreadInternalNotificationCountQuery(
    undefined,
    { refetchOnMountOrArgChange: true },
  )

  const notifications = notificationsData?.data || []
  const unreadCount =
    unreadCountData?.data?.count ?? notifications.filter((notification) => !notification.isRead).length
  const badgeStorageKey = useMemo(() => {
    const userId = String(user?.rowid || user?.id || '').trim() || 'anonymous'
    return `notification-bell-state:${userId}`
  }, [user?.id, user?.rowid])
  const visibleUnreadCount = Math.max(
    0,
    badgeState.cachedCount > badgeState.snoozedCount ? badgeState.cachedCount : 0,
  )
  const unreadBadgeLabel = visibleUnreadCount > 99 ? '99+' : String(visibleUnreadCount)

  const commitBadgeState = (nextState) => {
    setBadgeState(nextState)
    writeStoredBadgeState(badgeStorageKey, nextState)
  }

  useEffect(() => {
    setBadgeState(readStoredBadgeState(badgeStorageKey))
  }, [badgeStorageKey])

  useEffect(() => {
    setBadgeState((current) => {
      if (!Number.isFinite(unreadCount)) {
        return current
      }

      if (unreadCount > current.cachedCount) {
        setIsPulsing(true)
        window.clearTimeout(pulseTimeoutRef.current)
        pulseTimeoutRef.current = window.setTimeout(() => {
          setIsPulsing(false)
        }, 1200)
        const nextState = {
          cachedCount: unreadCount,
          snoozedCount: current.snoozedCount,
        }
        writeStoredBadgeState(badgeStorageKey, nextState)
        return nextState
      }

      if (isOpen && unreadCount < current.cachedCount) {
        const nextState = {
          cachedCount: unreadCount,
          snoozedCount: unreadCount,
        }
        writeStoredBadgeState(badgeStorageKey, nextState)
        return nextState
      }

      if (isOpen && unreadCount === 0 && current.cachedCount !== 0) {
        const nextState = {
          cachedCount: 0,
          snoozedCount: 0,
        }
        writeStoredBadgeState(badgeStorageKey, nextState)
        return nextState
      }

      if (unreadCount <= current.cachedCount) {
        return current
      }

      return current
    })
  }, [badgeStorageKey, isOpen, unreadCount])

  useEffect(
    () => () => {
      window.clearTimeout(pulseTimeoutRef.current)
    },
    [],
  )

  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (left, right) =>
          new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime(),
      ),
    [notifications],
  )

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleOpenLink = async (notification) => {
    try {
      if (!notification?.isRead) {
        await readNotification(notification.id).unwrap()
        commitBadgeState({
          cachedCount: Math.max(0, unreadCount - 1),
          snoozedCount: Math.max(0, unreadCount - 1),
        })
      }
    } catch (error) {
      // let the existing toast handling surface any failure
    }

    setIsOpen(false)
    if (notification?.actionUrl) {
      navigate(notification.actionUrl)
    }
  }

  const handleMarkAll = async () => {
    try {
      await readAllNotifications().unwrap()
      commitBadgeState({
        cachedCount: 0,
        snoozedCount: 0,
      })
    } catch (error) {
      // handled globally
    }
  }

  const handleBellClick = () => {
    commitBadgeState({
      cachedCount: badgeState.cachedCount,
      snoozedCount: badgeState.cachedCount,
    })
    setIsOpen((current) => !current)
  }

  return (
    <div className="notification-bell" ref={panelRef}>
      <button
        type="button"
        className={`notification-trigger ${unreadCount > 0 ? 'has-unread' : ''} ${isPulsing ? 'is-pulsing' : ''}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Notifications"
        onClick={handleBellClick}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6.2V12a7 7 0 1 0-14 0v3.8L3.7 17.3a1 1 0 0 0 .7 1.7h15.2a1 1 0 0 0 .7-1.7L19 15.8Z" />
        </svg>
        {visibleUnreadCount > 0 ? <span className="notification-badge">{unreadBadgeLabel}</span> : null}
      </button>

      {isOpen ? (
        <div className="notification-panel" role="menu" aria-label="Notifications">
          <div className="notification-panel-header">
            <div>
              <h2>Notifications</h2>
              <p>{visibleUnreadCount > 0 ? `${visibleUnreadCount} unread` : 'All caught up'}</p>
            </div>
            <button
              type="button"
              className="notification-mark-all"
              onClick={handleMarkAll}
              disabled={visibleUnreadCount === 0 || isMarkingAllRead}
            >
              {isMarkingAllRead ? 'Saving...' : 'Mark all read'}
            </button>
          </div>

          <div className="notification-list">
            {isFetching ? (
              <div className="notification-empty">Loading notifications...</div>
            ) : sortedNotifications.length ? (
              sortedNotifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={`notification-item ${notification.isRead ? 'is-read' : 'is-unread'}`}
                  onClick={() => handleOpenLink(notification)}
                >
                  <div className="notification-item-main">
                    <div className="notification-item-title-row">
                      <strong>{notification.title}</strong>
                      {!notification.isRead ? <span className="notification-dot" /> : null}
                    </div>
                    <p>{notification.message}</p>
                  </div>
                  <span className="notification-time">
                    {formatRelativeTime(notification.createdAt)}
                  </span>
                </button>
              ))
            ) : (
              <div className="notification-empty">No notifications yet.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default NotificationBell
