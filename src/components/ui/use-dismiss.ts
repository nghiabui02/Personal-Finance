import { useEffect, useRef } from 'react'

/**
 * Closes something that floats over the page — a menu, a panel — on a press
 * outside it or on Escape. Listens only while it is open.
 *
 * `onDismiss` may be a new function on every render; the latest one is called,
 * so callers do not have to memoise it.
 */
export function useDismiss(
  ref: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
  onDismiss: () => void,
) {
  const onDismissRef = useRef(onDismiss)
  useEffect(() => { onDismissRef.current = onDismiss })

  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onDismissRef.current()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismissRef.current()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, ref])
}
