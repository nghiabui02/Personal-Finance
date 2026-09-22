'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Track last pointer-down position for origin animation
let _originX = 0
let _originY = 0

/**
 * Which input opened the modal.
 *
 * A click leaves the trigger focused but unringed, because the browser is in
 * pointer modality. Pressing Escape flips it to keyboard modality, and the ring
 * appears on a button the user never navigated to. Keyboard users do want focus
 * back on the trigger; pointer users have no use for it.
 */
let _lastInputWasKeyboard = false

if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', e => {
    _originX = e.clientX
    _originY = e.clientY
    _lastInputWasKeyboard = false
  }, true)
  document.addEventListener('keydown', () => {
    _lastInputWasKeyboard = true
  }, true)
}

/**
 * Freezes the page behind the modal.
 *
 * `overflow: hidden` on <body> is ignored by iOS Safari, so the page is pinned
 * with `position: fixed` and its offset restored on close. Skipped when the
 * document does not scroll — on desktop the shell is capped at viewport height
 * and <main> scrolls instead, which the backdrop already sits over.
 */
let _lockDepth = 0

function lockPageScroll(): () => void {
  const owns = _lockDepth++ === 0 && document.documentElement.scrollHeight > window.innerHeight
  if (!owns) return () => { _lockDepth-- }

  const offset = window.scrollY
  const { style } = document.body
  style.position = 'fixed'
  style.top = `-${offset}px`
  style.left = '0'
  style.right = '0'

  return () => {
    _lockDepth--
    style.position = ''
    style.top = ''
    style.left = ''
    style.right = ''
    window.scrollTo(0, offset)
  }
}

/**
 * Makes everything outside the modal unclickable and untabbable.
 *
 * Only the body children that exist right now are marked, so panels a field
 * opens later — they portal to <body> too — stay interactive.
 */
function deactivateBackground(...ownNodes: (Element | null)[]): () => void {
  const marked = Array.from(document.body.children).filter(
    // NEXTJS-PORTAL is the dev error overlay — inert would lock its buttons too.
    el => !ownNodes.includes(el) && !el.hasAttribute('inert') && el.tagName !== 'NEXTJS-PORTAL'
  )
  marked.forEach(el => el.setAttribute('inert', ''))
  return () => marked.forEach(el => el.removeAttribute('inert'))
}

/** Card animation, in ms. The close timer has to outlast the CSS transition,
 *  so both read from here. */
const OPEN_MS = 240
const CLOSE_MS = 200

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

interface ModalProps {
  title?: string
  size?: 'sm' | 'md'
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ title, size = 'sm', onClose, children }: ModalProps) {
  const [stage, setStage] = useState<'enter' | 'open' | 'closing'>('enter')
  // Origin is captured once on mount (last pointer-down position)
  const [origin] = useState(() => ({
    x: _originX || (typeof window !== 'undefined' ? window.innerWidth / 2 : 400),
    y: _originY || (typeof window !== 'undefined' ? window.innerHeight / 2 : 300),
  }))

  // Captured at open time: by the moment the modal closes, Escape has already
  // flipped the modality to keyboard.
  const [openedByKeyboard] = useState(() => _lastInputWasKeyboard)
  const triggerRef = useRef<HTMLElement | null>(
    typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null
  )

  useEffect(() => {
    const trigger = triggerRef.current
    return () => {
      if (openedByKeyboard || !trigger) return
      // Only the trigger itself — anything else focused was a deliberate move.
      if (document.activeElement === trigger) trigger.blur()
    }
  }, [openedByKeyboard])

  const closingRef = useRef(false)
  const backdropRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unlockScroll = lockPageScroll()
    const reactivate = deactivateBackground(backdropRef.current, frameRef.current)
    return () => {
      reactivate()
      unlockScroll()
    }
  }, [])

  // Track the latest onClose without re-registering the stack/keydown effect
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  const handleClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setStage('closing')
    setTimeout(() => onCloseRef.current(), CLOSE_MS + 10)
  }, [])

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
  }, [handleClose])

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
  const dx = origin.x - vw / 2
  const dy = origin.y - vh / 2

  const backdropStyle = {
    opacity: stage === 'open' ? 1 : 0,
    transition: `opacity ${OPEN_MS}ms ease`,
  }

  // Starts at 0.4 rather than near-zero: the card has to be a real click target
  // almost immediately, or a quick click lands past its edge and hits the
  // backdrop, which reads as the click being swallowed.
  const cardStyle: React.CSSProperties =
    stage === 'open'
      ? {
          transform: 'translate(0,0) scale(1)',
          opacity: 1,
          transition: `transform ${OPEN_MS}ms cubic-bezier(0.16,1,0.3,1), opacity 160ms ease`,
        }
      : {
          transform: `translate(${dx}px, ${dy}px) scale(0.4)`,
          opacity: 0,
          transition:
            stage === 'closing'
              ? `transform ${CLOSE_MS}ms cubic-bezier(0.4,0,0.6,1), opacity ${CLOSE_MS}ms ease`
              : 'none',
        }

  // Portal to <body> so ancestors with transform/filter (e.g. entrance animations)
  // can't become the containing block and clip the fixed backdrop
  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        ref={backdropRef}
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        style={backdropStyle}
        onClick={stage === 'open' ? handleClose : undefined}
      />
      <div ref={frameRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full ${sizes[size]} p-6 pointer-events-auto max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain`}
          style={cardStyle}
          onClick={e => e.stopPropagation()}
        >
          {title && (
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5">{title}</h2>
          )}
          {children}
        </div>
      </div>
    </>,
    document.body
  )
}
