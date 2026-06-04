import './NotificationToast.css'
import { useEffect, useState } from 'react'

type NotificationToastValue = {
  id: string
  text: string
}

type NotificationToastProps = {
  toast?: NotificationToastValue
}

const NOTIFICATION_TOAST_VISIBLE_MS = 2600

export function NotificationToast({ toast }: NotificationToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!toast) {
      setVisible(false)
      return
    }

    setVisible(true)
    const timeoutId = window.setTimeout(() => {
      setVisible(false)
    }, NOTIFICATION_TOAST_VISIBLE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [toast])

  if (!toast) {
    return null
  }

  return (
    <div
      className={visible ? 'notification-toast notification-toast-visible' : 'notification-toast'}
      role="status"
      aria-live="polite"
    >
      {toast.text}
    </div>
  )
}
