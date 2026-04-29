const listeners = new Set()
let lastToastKey = ''
let lastToastAt = 0

export const toastService = {
  subscribe(callback) {
    listeners.add(callback)
    return () => listeners.delete(callback)
  },
  show(message) {
    const now = Date.now()
    const toastKey = JSON.stringify({
      severity: message?.severity || '',
      summary: message?.summary || '',
      detail: message?.detail || '',
    })

    if (toastKey === lastToastKey && now - lastToastAt < 1500) {
      return
    }

    lastToastKey = toastKey
    lastToastAt = now
    listeners.forEach((callback) => callback(message))
  },
}
