const listeners = new Set()

export const toastService = {
  subscribe(callback) {
    listeners.add(callback)
    return () => listeners.delete(callback)
  },
  show(message) {
    listeners.forEach((callback) => callback(message))
  },
}
