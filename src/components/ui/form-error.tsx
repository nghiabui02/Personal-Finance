/** The red line under a form's fields. Renders nothing while there is no error. */
export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null
  return <p className="text-sm text-rose-600 dark:text-rose-400">{message}</p>
}
