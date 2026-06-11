import { useEffect } from 'react'

const PICKER_INPUT_TYPES = new Set(['date', 'datetime-local', 'month', 'week', 'time'])

const openNativePicker = (input) => {
  if (!(input instanceof HTMLInputElement)) return
  if (!PICKER_INPUT_TYPES.has(input.type)) return
  if (input.disabled || input.readOnly) return

  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker()
    } catch {
      input.focus()
    }
    return
  }

  input.focus()
}

function NativeDatePickerEnhancer() {
  useEffect(() => {
    const handleClick = (event) => {
      openNativePicker(event.target)
    }

    document.addEventListener('click', handleClick, true)

    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  }, [])

  return null
}

export default NativeDatePickerEnhancer
