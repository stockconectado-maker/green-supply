import type { Metadata } from 'next'
import './globals.css'
import AppShell from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'Green Supply',
  description: 'Sistema interno de gestión Green Supply',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  )
}