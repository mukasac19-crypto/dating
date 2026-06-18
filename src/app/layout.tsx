import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
// 1. IMPORT THE ANALYTICS COMPONENT
import { GoogleAnalytics } from '@next/third-parties/google'
import AnalyticsRouteTracker from '@/components/AnalyticsRouteTracker'
import MetaPixel from '@/components/MetaPixel'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Swipe Safe - Protect Your Heart',
  description: 'AI-powered dating safety tool that analyzes conversations to protect against scams and manipulation while highlighting trust signals.',
  keywords: 'dating safety, online dating, scam protection, relationship health, AI analysis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#16a34a',
              },
            },
            error: {
              style: {
                background: '#dc2626',
              },
            },
          }}
        />
        {children}
        
        {/* 2. ADD THE COMPONENT WITH YOUR ID */}
        <GoogleAnalytics gaId="G-3J7SQ7MSHB" />
        {/* Fires titled page_views on client-side route changes */}
        <AnalyticsRouteTracker />
        {/* Meta (Facebook) Pixel */}
        <MetaPixel />
      </body>
    </html>
  )
}