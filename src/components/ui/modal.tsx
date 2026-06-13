'use client'

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

export function Modal({ title, size = 'sm', onClose, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full ${sizes[size]} p-6`}
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
