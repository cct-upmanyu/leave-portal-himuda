import { useEffect, useRef } from 'react'
import { Toast } from 'primereact/toast'
import { toastService } from '../utils/toastService'

function ToastHost() {
  const toastRef = useRef(null)

  useEffect(() => {
    const unsubscribe = toastService.subscribe((message) => {
      toastRef.current?.show(message)
    })
    return unsubscribe
  }, [])

  return <Toast ref={toastRef} position="top-right" />
}

export default ToastHost
