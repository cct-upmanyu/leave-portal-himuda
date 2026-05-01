function AuthScreenLoader() {
  return (
    <div className="auth-screen-loader" role="status" aria-live="polite" aria-label="Loading session">
      <div className="auth-screen-loader__panel">
        <div className="auth-screen-loader__spinner" />
        <p className="auth-screen-loader__text">Restoring your session...</p>
      </div>
    </div>
  )
}

export default AuthScreenLoader
