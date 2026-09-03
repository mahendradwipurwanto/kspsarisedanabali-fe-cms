import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono-jb', display: 'swap', weight: ['400', '500'] })

export const metadata: Metadata = {
  title: { default: 'Konsol — KSP Sari Sedana Bali', template: '%s · Konsol KSP' },
  description: 'Konsol pengelolaan website KSP Sari Sedana Bali.',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg', apple: '/favicon.svg' },
  // Belt and braces alongside the X-Robots-Tag header in next.config.ts.
  robots: { index: false, follow: false, nocache: true },
}

export const viewport: Viewport = { themeColor: '#0f1b2d', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${jakarta.variable} ${mono.variable}`}>
      <body className="min-h-screen">
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="bottom-right" offset={20} toastOptions={{ duration: 4200 }} />
      </body>
    </html>
  )
}
