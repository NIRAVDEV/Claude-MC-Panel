// app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
// import { NextAuthProvider } from './providers'
import { Navbar } from '@/components/navbar'
import { NextAuthProvider } from './providers'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { AuthProvider } from '@/lib/auth-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MinecraftHost - Free Minecraft Server Hosting',
  description: 'Host your Minecraft server for free with our credit-based system. Earn credits by viewing ads and clicking links.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NextAuthProvider>
          <AuthProvider>
            <Analytics/>
            <SpeedInsights/>
            <Navbar />
            <main>{children}</main>
          </AuthProvider>
        </NextAuthProvider>
      </body>
    </html>
  )
}