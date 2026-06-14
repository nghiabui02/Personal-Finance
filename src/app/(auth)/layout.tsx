export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 pt-safe pb-safe">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
