import { requireUser } from '@/lib/server/auth'
import Link from 'next/link'

const CHEVRON = (
  <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
  </svg>
)

const ACCOUNT_GROUPS = [
  [
{
      href: '/categories',
      label: 'Categories',
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z"/>
        </svg>
      ),
    },
{
      href: '/settings',
      label: 'Settings',
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
        </svg>
      ),
    },
  ],
]

export default async function MorePage() {
  const { user } = await requireUser()

  const meta = user.user_metadata ?? {}
  const displayName = (meta.full_name as string) || user.email?.split('@')[0] || 'User'
  const email = user.email ?? ''
  const avatarUrl = meta.avatar_url as string | undefined
  const initials = displayName[0]?.toUpperCase() ?? 'U'

  return (
    <div className="space-y-3 pb-2">
      {/* Profile card */}
      <Link
        href="/settings"
        className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl border border-hairline px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- tiny remote avatar, host varies per auth provider
          <img src={avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700 shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-900 dark:bg-gray-200 flex items-center justify-center text-white dark:text-gray-900 text-lg font-semibold shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{displayName}</p>
          <p className="text-sm text-gray-400 truncate">{email}</p>
        </div>
        {CHEVRON}
      </Link>

      {/* Nav groups */}
      {ACCOUNT_GROUPS.map((group, gi) => (
        <div key={gi} className="bg-white dark:bg-gray-900 rounded-2xl border border-hairline overflow-hidden">
          {group.map((item, ii) => (
            <div key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400`}>
                  {item.icon}
                </span>
                <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{item.label}</span>
                {CHEVRON}
              </Link>
              {ii < group.length - 1 && (
                <div className="ml-[3.75rem] border-b border-hairline" />
              )}
            </div>
          ))}
        </div>
      ))}

    </div>
  )
}
