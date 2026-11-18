interface EmptyStateProps {
  message: string
  action?: { label: string; onClick: () => void }
  secondaryAction?: { label: string; onClick: () => void }
}

export function EmptyState({ message, action, secondaryAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-sm text-gray-400">{message}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-2 text-sm text-brand hover:underline"
        >
          {action.label}
        </button>
      )}
      {secondaryAction && (
        <button
          type="button"
          onClick={secondaryAction.onClick}
          className="mt-2 text-sm text-gray-500 dark:text-gray-400 hover:underline"
        >
          {secondaryAction.label}
        </button>
      )}
    </div>
  )
}
