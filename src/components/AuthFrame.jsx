import logo from '../assets/logo.webp'

function AuthFrame({ heading, children }) {
  return (
    <div className="login-page">
      <div className="login-card">
        <section className="login-panel login-panel--left">
          <div className="login-left-content">
            <p className="login-welcome">Welcome to <span>HIMUDA</span></p>
            <div className="login-logo-ring">
              <img className="login-logo-image" src={logo} alt="HIMUDA logo" />
            </div>
            <p className="login-org">HP Housing & Urban Development Authority</p>
            <p className="login-tagline">(A Government Undertaking, Himachal Pradesh)</p>
            <div className="login-divider" />
            <h1 className="login-title">LEAVE PORTAL</h1>
          </div>
        </section>

        <section className="login-panel login-panel--right">
          <div className="login-form">
            <h2>{heading}</h2>
            {children}
          </div>
        </section>
      </div>
    </div>
  )
}

export default AuthFrame
