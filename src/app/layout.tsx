import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UPIPulse — India Personal Finance',
  description: 'Automated personal finance tracker from bank SMS & UPI notifications',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'UPIPulse',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#09090b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-background text-zinc-100 min-h-screen selection:bg-emerald-500 selection:text-white pb-20">
        <main className="max-w-md mx-auto min-h-screen flex flex-col px-4 pt-4">
          {children}
        </main>
      </body>
    </html>
  );
}
