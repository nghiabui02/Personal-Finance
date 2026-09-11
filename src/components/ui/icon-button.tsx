/**
 * Icon-only action button used in card/row toolbars (edit, delete, pause…).
 *
 * `label` is required: an icon-only button has no text node, so without it
 * screen readers announce nothing. It doubles as the hover tooltip.
 */

type IconButtonTone = 'neutral' | 'danger' | 'positive' | 'brand'

const TONE_CLASSES: Record<IconButtonTone, string> = {
  neutral:  'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
  danger:   'text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40',
  positive: 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40',
  brand:    'text-gray-400 hover:text-brand hover:bg-brand-soft',
}

interface IconButtonProps {
  label: string
  onClick: () => void
  tone?: IconButtonTone
  disabled?: boolean
  children: React.ReactNode
}

export function IconButton({ label, onClick, tone = 'neutral', disabled, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${TONE_CLASSES[tone]}`}
    >
      {children}
    </button>
  )
}

// ── Shared 13px action icons ─────────────────────────────────────────────────

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24"
         stroke="currentColor" strokeWidth={2} aria-hidden="true">
      {children}
    </svg>
  )
}

export const EditIcon = (
  <Icon>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
  </Icon>
)

export const TrashIcon = (
  <Icon>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </Icon>
)
