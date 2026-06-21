'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'

// Track last pointer-down position for origin animation
let _originX = 0
let _originY = 0

if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', e => {
    _originX = e.clientX
    _originY = e.clientY
  }, true)
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md' }

// Context so child Cancel buttons can trigger the animated close
const ModalCloseCtx = createContext<() => void>(() => {})
export const useModalClose = () => useContext(ModalCloseCtx)

interface ModalProps {
  title?: string
  size?: 'sm' | 'md'
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ title, size = 'sm', onClose, children }: ModalProps) {
  const [stage, setStage] = useState<'enter' | 'open' | 'closing'>('enter')
  // Capture origin at mount time (sync, before first render)
  const ox = useRef(_originX || (typeof window !== 'undefined' ? window.innerWidth / 2 : 400))
  const oy = useRef(_originY || (typeof window !== 'undefined' ? window.innerHeight / 2 : 300))

  // enter → open (two rAFs to guarantee browser painted the initial state first)
  useEffect(() => {
    let raf1: number
    const raf0 = requestAnimationFrame(() => {
      raf1 = requestAnimationFrame(() => setStage('open'))
    })
    return () => { cancelAnimationFrame(raf0); cancelAnimationFrame(raf1) }
  }, [])

  function handleClose() {
    setStage('closing')
    setTimeout(onClose, 240)
  }

  const vw = typeof window !== 'undefined' ? window.innerWidth : 800
  const vh = typeof window !== 'undefined' ? window.innerHeight : 600
  const dx = ox.current - vw / 2
  const dy = oy.current - vh / 2

  const backdropStyle = {
    opacity: stage === 'open' ? 1 : 0,
    transition: 'opacity 0.22s ease',
  }

  const cardStyle: React.CSSProperties =
    stage === 'open'
      ? {
          transform: 'translate(0,0) scale(1)',
          opacity: 1,
          transition: 'transform 0.38s cubic-bezier(0.34,1.56,0.64,1), opacity 0.16s ease',
        }
      : {
          transform: `translate(${dx}px, ${dy}px) scale(0.05)`,
          opacity: 0,
          transition:
            stage === 'closing'
              ? 'transform 0.24s cubic-bezier(0.4,0,0.6,1), opacity 0.18s ease'
              : 'none',
        }

  return (
    <ModalCloseCtx.Provider value={handleClose}>
      {/* Backdrop — separate layer so its opacity doesn't affect card */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        style={backdropStyle}
        onClick={handleClose}
      />
      {/* Card layer */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full ${sizes[size]} p-6 pointer-events-auto`}
          style={cardStyle}
          onClick={e => e.stopPropagation()}
        >
          {title && (
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5">{title}</h2>
          )}
          {children}
        </div>
      </div>
    </ModalCloseCtx.Provider>
  )
}
