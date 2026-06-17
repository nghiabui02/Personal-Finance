import type { Metadata, Viewport } from "next";
import Providers from "./providers";
import "./globals.css";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-visual',
}

export const metadata: Metadata = {
  title: {
    template: '%s — Finance',
    default: 'Finance',
  },
  description: 'Personal finance manager',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full overflow-hidden overscroll-none bg-gray-50 dark:bg-gray-950 antialiased"
      suppressHydrationWarning
    >
      <body className="h-full overflow-hidden overscroll-none bg-gray-50 dark:bg-gray-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
