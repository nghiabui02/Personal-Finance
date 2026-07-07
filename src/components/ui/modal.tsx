'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

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

// Module-level stack — works regardless of where useModalClose() is called in the component tree
const _closeStack: (() => void)[] = []

// Returns a stable function that reads from the stack at call time (not render time)
// so it always gets the correct handleClose even when called from a parent component
export function useModalClose(): () => void {
  return useCallback(() => {
    _closeStack[_closeStack.length - 1]?.()
  }, [])
}

export function ModalClose({ children }: { children: React.ReactElement<{ onClick?: () => void }> }) {
  const close = useModalClose()
  return React.cloneElement(children, { onClick: close })
}

interface ModalProps {
  title?: string
  size?: 'sm' | 'md'
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ title, size = 'sm', onClose, children }: ModalProps) {
  const [stage, setStage] = useState<'enter' | 'open' | 'closing'>('enter')
  const ox = useRef(_originX || (typeof window !== 'undefined' ? window.innerWidth / 2 : 400))
  const oy = useRef(_originY || (typeof window !== 'undefined' ? window.innerHeight / 2 : 300))

  const closingRef = useRef(false)

  function handleClose() {
    if (closingRef.current) return
    closingRef.current = true
    setStage('closing')
    setTimeout(onClose, 420)
  }

  // Push handleClose onto the stack when modal opens, pop when it unmounts.
  // Escape closes only the topmost modal in the stack.
  useEffect(() => {
    _closeStack.push(handleClose)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && _closeStack[_closeStack.length - 1] === handleClose) {
        handleClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      _closeStack.pop()
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  // enter → open
  useEffect(() => {
    let raf1: number
    const raf0 = requestAnimationFrame(() => {
      raf1 = requestAnimationFrame(() => setStage('open'))
    })
    return () => { cancelAnimationFrame(raf0); cancelAnimationFrame(raf1) }
  }, [])

  const vw = typeof window !== 'undefined' ? window.innerWidth : 800
  const vh = typeof window !== 'undefined' ? window.innerHeight : 600
  const dx = ox.current - vw / 2
  const dy = oy.current - vh / 2

  const backdropStyle = {
    opacity: stage === 'open' ? 1 : 0,
    transition: 'opacity 0.35s ease',
  }

  const cardStyle: React.CSSProperties =
    stage === 'open'
      ? {
          transform: 'translate(0,0) scale(1)',
          opacity: 1,
          transition: 'transform 0.55s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
        }
      : {
          transform: `translate(${dx}px, ${dy}px) scale(0.05)`,
          opacity: 0,
          transition:
            stage === 'closing'
              ? 'transform 0.4s cubic-bezier(0.4,0,0.6,1), opacity 0.3s ease'
              : 'none',
        }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        style={backdropStyle}
        onClick={handleClose}
      />
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
    </>
  )
}
