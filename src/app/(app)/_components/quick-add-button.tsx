import Link from 'next/link'

/**
 * The centre slot of the mobile bottom bar. It navigates rather than opening a
 * dialog: the create form is tall, and a dialog on a phone puts a scroll inside
 * a scroll. Desktop keeps the dialog — there is room for it there.
 */
export function QuickAddButton() {
  return (
    <Link
      href="/transactions/new"
      aria-label="New transaction"
      className="-mt-5 w-14 h-14 rounded-full bg-brand-fill hover:bg-brand-fill-hover text-white shadow-[0_8px_24px_-6px_rgb(79_70_229/0.5)] flex items-center justify-center ring-4 ring-white dark:ring-gray-900 transition-[transform,background-color] duration-150 hover:scale-105 active:scale-95"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24"
           stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </Link>
  )
}
