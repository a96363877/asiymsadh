import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'نظام الإشعارات',
  description: 'نظام إدارة الإشعارات',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{zoom:0.8,height:'100vh'}} className={inter.className}>{children}</body>
    </html>
  )
}

