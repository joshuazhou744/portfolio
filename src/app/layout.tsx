import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import 'normalize.css'
import '98.css/dist/98.css'
import { ClientBody } from './ClientBody'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'template',
  description: 'template description.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <Script src="https://sdk.scdn.co/spotify-player.js" strategy="beforeInteractive" />
      </head>
      <body className={inter.className} style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        <ClientBody>
          {children}
        </ClientBody>
      </body>
    </html>
  )
}
