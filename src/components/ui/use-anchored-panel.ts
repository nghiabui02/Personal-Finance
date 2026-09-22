'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Positions a floating panel against its trigger.
 *
 * A panel opened inside a modal cannot be `absolute`: the modal card is an
 * `overflow-y-auto` scrollport with a transform, so the panel gets clipped at
 * its edge. Every picker here portals to <body> and positions `fixed` instead,
 * which means it also has to follow the trigger as the modal scrolls.
 */

interface PanelPos {
  top?: number
  bottom?: number
  left: number
  width: number
}

interface Options {
  /** Tallest the panel can get — decides whether it opens up or down. */
  height: number
  /** Floor for the panel width when the trigger is narrower. */
  minWidth?: number
}

export function useAnchoredPanel<T extends HTMLElement>(
  open: boolean,
  { height, minWidth = 0 }: Options,
) {
  const triggerRef = useRef<T>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<PanelPos | null>(null)

  const compute = useCallback((): PanelPos | null => {
    const trigger = triggerRef.current
    if (!trigger) return null
    const rect = trigger.getBoundingClientRect()
    const width = Math.max(minWidth, rect.width)

    // Anchor to whichever edge keeps the panel on screen
    let left = rect.left
    const overflowsRight = rect.left + width > window.innerWidth - 8
    const fitsWhenRightAligned = rect.right - width >= 8
    if (overflowsRight && fitsWhenRightAligned) left = rect.right - width
    left = Math.max(8, Math.min(left, window.innerWidth - 8 - width))

    // Open toward the larger space when it doesn't fit below
    const spaceBelow = window.innerHeight - rect.bottom
    return spaceBelow < height && rect.top > spaceBelow
      ? { bottom: window.innerHeight - rect.top + 4, left, width }
      : { top: rect.bottom + 4, left, width }
  }, [height, minWidth])

  /**
   * Keeps the previous object when the numbers match. The scroll listener below
   * is capture-phase, so it also fires for the panel's own option list — without
   * this, every scrolled pixel would hand React a new object and re-render the
   * whole field for a position that never moved.
   */
  const apply = useCallback(() => {
    const next = compute()
    setPos(prev =>
      prev && next && prev.top === next.top && prev.bottom === next.bottom
        && prev.left === next.left && prev.width === next.width
        ? prev
        : next,
    )
  }, [compute])

  /** Call when opening, before the panel renders. */
  const reposition = apply

  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', apply, true)
    window.addEventListener('resize', apply)
    return () => {
      window.removeEventListener('scroll', apply, true)
      window.removeEventListener('resize', apply)
    }
  }, [open, apply])

  return { triggerRef, panelRef, pos, reposition }
}

/**
 * Closes on a click outside both the trigger's container and the portaled
 * panel — the panel is not a DOM descendant of the field.
 */
export function useOutsideClose(
  containerRef: React.RefObject<HTMLElement | null>,
  panelRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [containerRef, panelRef, onClose])
}
