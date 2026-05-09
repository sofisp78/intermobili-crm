import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/layout/AppShell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Intermobili CRM',
  description: 'CRM comercial Intermobili',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-warm-50 text-gray-900 antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
