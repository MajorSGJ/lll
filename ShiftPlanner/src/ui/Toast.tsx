import { createContext, useCallback, useContext, useState, useEffect } from 'react'
import { useStore } from '../store'

type ToastType = 'info' | 'success' | 'error'

type ToastItem = {
  id: number
  message: string
  type: ToastType
}

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('ToastContext not mounted')
  return ctx.toast
}

let toastId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const { data } = useStore()
  const showSuccessToasts = data?.settings?.showSuccessToasts !== false
  const showInfoToasts = data?.settings?.showInfoToasts !== false

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    if (type === 'success' && !showSuccessToasts) return
    if (type === 'info' && !showInfoToasts) return
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
  }, [showInfoToasts, showSuccessToasts])

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toastContainer">
        {toasts.map(t => (
          <ToastItem key={t.id} item={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ item, onRemove }: { item: ToastItem; onRemove: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(item.id), 4000)
    return () => clearTimeout(timer)
  }, [item.id, onRemove])

  const className = `toast ${item.type === 'error' ? 'error' : item.type === 'success' ? 'success' : ''}`

  const meta =
    item.type === 'error'
      ? { icon: '⛔', title: 'Błąd' }
      : item.type === 'success'
        ? { icon: '✅', title: 'Sukces' }
        : { icon: 'ℹ️', title: 'Informacja' }

  return (
    <div className={className} role="status" aria-live="polite">
      <div className="toastIcon" aria-hidden="true">
        {meta.icon}
      </div>
      <div className="toastBody">
        <div className="toastTitle">{meta.title}</div>
        <div className="toastMsg">{item.message}</div>
      </div>
      <button className="toastClose" type="button" onClick={() => onRemove(item.id)} aria-label="Zamknij">
        ✕
      </button>
    </div>
  )
}
