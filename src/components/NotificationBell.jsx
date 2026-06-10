import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useGetInternalNotificationsQuery,
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

const NotificationBell = () => {
  const navigate = useNavigate()
  const panelRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [readNotification] = useMarkInternalNotificationReadMutation()
  const [readAllNotifications, { isLoading: isMarkingAllRead }] =
    useMarkAllInternalNotificationsReadMutation()
  const { data: notificationsData, isFetching } = useGetInternalNotificationsQuery(
    { limit: 25 },
    { refetchOnMountOrArgChange: true },
  )
  const { data: unreadData } = useGetInternalNotificationsQuery(
    { unreadOnly: true, limit: 50 },
    { refetchOnMountOrArgChange: true },
  )

  const notifications = notificationsData?.data || []
  const unreadNotifications = unreadData?.data || []
  const unreadCount = unreadNotifications.length

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
    } catch (error) {
      // handled globally
    }
  }

  return (
    <div className="notification-bell" ref={panelRef}>
      <button
        type="button"
        className={`notification-trigger ${unreadCount > 0 ? 'has-unread' : ''}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Notifications"
        onClick={() => setIsOpen((current) => !current)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6.2V12a7 7 0 1 0-14 0v3.8L3.7 17.3a1 1 0 0 0 .7 1.7h15.2a1 1 0 0 0 .7-1.7L19 15.8Z" />
        </svg>
        {unreadCount > 0 ? <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
      </button>

      {isOpen ? (
        <div className="notification-panel" role="menu" aria-label="Notifications">
          <div className="notification-panel-header">
            <div>
              <h2>Notifications</h2>
              <p>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
            </div>
            <button
              type="button"
              className="notification-mark-all"
              onClick={handleMarkAll}
              disabled={unreadCount === 0 || isMarkingAllRead}
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
