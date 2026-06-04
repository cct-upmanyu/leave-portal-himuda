import { useState } from 'react'
import '../styles/PasswordField.css'

function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder,
  required,
  autoComplete = 'current-password',
  className = '',
  inputClassName = '',
}) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className={`password-input-shell ${className}`.trim()}>
      <input
        id={id}
        type={isVisible ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className={`password-input-shell__input ${inputClassName}`.trim()}
      />
      <button
        type="button"
        className="password-input-shell__toggle"
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((prev) => !prev)}
      >
        <i className={`pi ${isVisible ? 'pi-eye-slash' : 'pi-eye'}`} aria-hidden="true" />
      </button>
    </div>
  )
}

export default PasswordInput
