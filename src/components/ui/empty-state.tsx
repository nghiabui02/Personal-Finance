interface EmptyStateProps {
  message: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-sm text-gray-400">{message}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-2 text-sm text-indigo-500 hover:underline"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
