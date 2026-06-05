import '../styles/ConfirmDialog.css'

function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  confirmClassName = 'danger',
  isLoading = false,
  onCancel,
  onConfirm,
}) {
  if (!open) return null

  return (
    <div className="confirm-dialog-backdrop" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="confirm-dialog-header">
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
          <button type="button" className="confirm-dialog-close" onClick={onCancel} aria-label="Close dialog">
            &times;
          </button>
        </div>

        {children ? <div className="confirm-dialog-content">{children}</div> : null}

        <div className="confirm-dialog-actions">
          <button type="button" className="confirm-dialog-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-dialog-confirm ${confirmClassName}`.trim()}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
