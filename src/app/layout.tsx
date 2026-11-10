import type { Metadata, Viewport } from "next";
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

export const metadata: Metadata = {
  title: {
    template: '%s — Finance',
    default: 'Finance',
  },
  description: 'Personal finance manager',
  manifest: '/manifest.webmanifest',
  // iOS reads these rather than the manifest: without them an icon added to
  // the home screen still opens inside Safari's chrome.
  appleWebApp: {
    capable: true,
    title: 'Finance',
    statusBarStyle: 'default',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full bg-gray-50 dark:bg-gray-950 antialiased"
      suppressHydrationWarning
    >
      <body className="h-full bg-gray-50 dark:bg-gray-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
