/**
 * The frame of every sign-in screen: a dark brand strip over a white panel.
 * The layout above it centres the card; what goes inside is the page's own.
 */
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-hairline shadow-sm">
      <div className="bg-panel px-6 py-5">
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center mb-3">
          <span className="text-white font-bold text-base leading-none">₫</span>
        </div>
        <p className="eyebrow text-slate-400">Personal Finance</p>
      </div>
      <div className="bg-white dark:bg-gray-900 px-6 py-6">{children}</div>
    </div>
  )
}

/** The title and the one line under it, at the top of the panel. */
export function AuthHeading({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h1>
      <p className="text-sm text-gray-400 mb-6">{children}</p>
    </>
  )
}
