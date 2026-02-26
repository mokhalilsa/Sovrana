import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sovrana | Polymarket Agent Platform',
  description: 'AI agent trading platform for Polymarket',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
