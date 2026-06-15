'use client'

import { useState } from 'react'

interface ModalProps {
  title?: string
  size?: 'sm' | 'md'
  onClose: () => void
  children: React.ReactNode
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
}

const ANIM_DURATION = 180 // ms — matches CSS animation duration

export function Modal({ title, size = 'sm', onClose, children }: ModalProps) {
  const [closing, setClosing] = useState(false)

  function handleClose() {
    setClosing(true)
    setTimeout(onClose, ANIM_DURATION)
  }

  const backdropAnim = closing
    ? 'animate-[modal-backdrop-out_0.18s_ease-out_forwards]'
    : 'animate-[modal-backdrop-in_0.18s_ease-out_forwards]'

  const contentAnim = closing
    ? 'animate-[modal-content-out_0.18s_ease-out_forwards]'
    : 'animate-[modal-content-in_0.2s_cubic-bezier(0.34,1.56,0.64,1)_forwards]'

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm ${backdropAnim}`}
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full ${sizes[size]} p-6 ${contentAnim}`}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5">{title}</h2>
        )}
        {children}
      </div>
    </div>
  )
}
