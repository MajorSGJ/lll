import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

type ConfirmVariant = 'default' | 'danger'

type ConfirmOptions = {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
}

type AlertOptions = {
  title?: string
  message: string
  confirmText?: string
  variant?: ConfirmVariant
}

type ConfirmContextValue = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  alert: (opts: AlertOptions) => Promise<void>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('ConfirmContext not mounted')
  return ctx.confirm
}

export function useAlert() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('ConfirmContext not mounted')
  return ctx.alert
}

type DialogState =
  | null
  | {
      kind: 'confirm' | 'alert'
      title: string
      message: string
      confirmText: string
      cancelText: string
      variant: ConfirmVariant
      resolve: (value: boolean) => void
    }

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>(null)
  const stateRef = useRef<DialogState>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const close = useCallback((value: boolean) => {
    const cur = stateRef.current
    if (!cur) return
    cur.resolve(value)
    setState(null)
  }, [])

  useEffect(() => {
    if (!state) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (state.kind === 'alert') close(true)
        else close(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state, close])

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        kind: 'confirm',
        title: opts.title || 'Potwierdź',
        message: opts.message,
        confirmText: opts.confirmText || 'OK',
        cancelText: opts.cancelText || 'Anuluj',
        variant: opts.variant || 'default',
        resolve,
      })
    })
  }, [])

  const alert = useCallback((opts: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setState({
        kind: 'alert',
        title: opts.title || 'Informacja',
        message: opts.message,
        confirmText: opts.confirmText || 'OK',
        cancelText: '',
        variant: opts.variant || 'default',
        resolve: () => resolve(),
      })
    })
  }, [])

  const value = useMemo<ConfirmContextValue>(() => ({ confirm, alert }), [confirm, alert])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state ? (
        <div className="modalOverlay" onMouseDown={() => (state.kind === 'alert' ? close(true) : close(false))}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()} style={{ width: 'min(640px, calc(100vw - 24px))' }}>
            <div className="modalHeader">
              <div className="modalTitle">{state.title}</div>
              <button className="iconBtn" type="button" onClick={() => (state.kind === 'alert' ? close(true) : close(false))}>
                ✕
              </button>
            </div>
            <div className="modalBody">
              <div className="modal-message">{state.message}</div>
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
                {state.kind === 'confirm' ? (
                  <button className="btn" type="button" onClick={() => close(false)}>
                    {state.cancelText}
                  </button>
                ) : null}
                <button
                  className={state.variant === 'danger' ? 'btn danger' : 'btn primary'}
                  type="button"
                  onClick={() => close(true)}
                >
                  {state.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  )
}
