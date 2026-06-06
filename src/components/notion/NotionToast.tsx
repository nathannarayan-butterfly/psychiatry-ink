import { useEffect, useState } from 'react'

interface ToastMessage {
  id: number
  text: string
}

let toastId = 0
let showToastFn: ((text: string) => void) | null = null

export function showNotionToast(text: string) {
  showToastFn?.(text)
}

export function NotionToastHost() {
  const [messages, setMessages] = useState<ToastMessage[]>([])

  useEffect(() => {
    showToastFn = (text: string) => {
      const id = ++toastId
      setMessages((current) => [...current, { id, text }])
      window.setTimeout(() => {
        setMessages((current) => current.filter((message) => message.id !== id))
      }, 2200)
    }
    return () => {
      showToastFn = null
    }
  }, [])

  if (messages.length === 0) return null

  return (
    <div className="notion-toast-host" aria-live="polite">
      {messages.map((message) => (
        <div key={message.id} className="notion-toast">
          {message.text}
        </div>
      ))}
    </div>
  )
}
