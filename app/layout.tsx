// app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NextAuthProvider } from './providers'
import { Navbar } from '@/components/navbar'
import { Analytics } from "@vercel/analytics/next"

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
          <Analytics/>
          <Navbar />
          <main>{children}</main>
        </NextAuthProvider>
      </body>
    </html>
  )
}