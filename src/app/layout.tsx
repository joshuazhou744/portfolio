import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import 'normalize.css'
import '98.css/dist/98.css'
import { ClientBody } from './ClientBody'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Nightwave Plaza - Online Vaporwave Radio',
  description: 'Nightwave Plaza is an advertisement-free 24/7 radio station dedicated to Vaporwave; bringing aesthetics and dream-like music to your device wherever you have Internet connectivity.',
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
      <body className={inter.className} style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        <ClientBody>
          {children}
        </ClientBody>
      </body>
    </html>
  )
}
