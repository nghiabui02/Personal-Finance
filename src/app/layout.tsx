import type { Metadata, Viewport } from "next";
import { getLocale, getTranslations } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'
import Providers from "./providers";
import "./globals.css";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9fafb' },
    { media: '(prefers-color-scheme: dark)',  color: '#030712' },
  ],
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common')
  return {
    title: {
      template: '%s — Finance',
      default: 'Finance',
    },
    description: t('description'),
    manifest: '/manifest.webmanifest',
    // iOS reads these rather than the manifest: without them an icon added to
    // the home screen still opens inside Safari's chrome.
    appleWebApp: {
      capable: true,
      title: 'Finance',
      statusBarStyle: 'default',
    },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale()
  return (
    <html
      lang={locale}
      className="h-full bg-gray-50 dark:bg-gray-950 antialiased"
      suppressHydrationWarning
    >
      <body className="h-full bg-gray-50 dark:bg-gray-950">
        <NextIntlClientProvider><Providers>{children}</Providers></NextIntlClientProvider>
      </body>
    </html>
  );
}
