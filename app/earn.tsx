// app/earn/page.tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Coins, ExternalLink, Play, Gift } from 'lucide-react'

export default function EarnPage() {
  const { user: session, refreshUser } = useAuth()
  const [isLoading, setIsLoading] = useState('')

  const earnCredits = async (type: string) => {
  if (!session?.email) return

    setIsLoading(type)
    try {
      const response = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })

      if (response.ok) {
        const data = await response.json()
  await refreshUser()
  alert(`You earned ${data.earned} credits! Total: ${data.credits}`)
      }
    } catch (error) {
      console.error('Failed to earn credits:', error)
    } finally {
      setIsLoading('')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Earn Credits</h1>
        <p className="text-muted-foreground">
          Watch ads and complete tasks to earn credits for your servers
        </p>
      </div>

  {session && (
        <div className="mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-2">
                <Coins className="h-6 w-6 text-yellow-500" />
                <span className="text-2xl font-bold">{session.credits || 0}</span>
                <span className="text-muted-foreground">Credits Available</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Watch Ads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Play className="h-5 w-5 mr-2 text-red-500" />
              Watch Video Ads
            </CardTitle>
            <CardDescription>
              Watch short video advertisements to earn credits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Reward per ad:</span>
              <Badge variant="secondary">5-10 Credits</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Duration:</span>
              <span className="text-sm text-muted-foreground">15-30 seconds</span>
            </div>
            <Button 
              className="w-full" 
              onClick={() => earnCredits('ad_view')}
              disabled={isLoading === 'ad_view'}
            >
              {isLoading === 'ad_view' ? 'Loading Ad...' : 'Watch Ad'}
            </Button>
          </CardContent>
        </Card>

        {/* Click Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ExternalLink className="h-5 w-5 mr-2 text-blue-500" />
              Click Sponsored Links
            </CardTitle>
            <CardDescription>
              Visit our partner websites to earn credits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Reward per click:</span>
              <Badge variant="secondary">2-5 Credits</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Time required:</span>
              <span className="text-sm text-muted-foreground">30 seconds</span>
            </div>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => earnCredits('link_click')}
              disabled={isLoading === 'link_click'}
            >
              {isLoading === 'link_click' ? 'Processing...' : 'Visit Partner Site'}
            </Button>
          </CardContent>
        </Card>

        {/* Daily Bonus */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Gift className="h-5 w-5 mr-2 text-green-500" />
              Daily Login Bonus
            </CardTitle>
            <CardDescription>
              Get free credits just for logging in each day
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Daily reward:</span>
              <Badge variant="secondary">10 Credits</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Streak bonus:</span>
              <span className="text-sm text-muted-foreground">+5 per day</span>
            </div>
            <Button className="w-full" disabled>
              Already Claimed Today
            </Button>
          </CardContent>
        </Card>

        {/* Referrals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Coins className="h-5 w-5 mr-2 text-purple-500" />
              Refer Friends
            </CardTitle>
            <CardDescription>
              Invite friends and earn credits when they sign up
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Reward per referral:</span>
              <Badge variant="secondary">50 Credits</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Your referral code:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {session?.id?.slice(-8).toUpperCase() || 'LOGIN_REQUIRED'}
              </code>
            </div>
            <Button className="w-full" variant="outline" disabled>
              Copy Referral Link
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Credit Usage Guide */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How to Use Your Credits</CardTitle>
          <CardDescription>Understanding our credit system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Server Costs</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• RAM: 25 credits per GB/month</li>
                <li>• Storage: 2 credits per GB/month</li>
                <li>• Example: 2GB RAM + 10GB = 70 credits/month</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Earning Tips</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Watch ads daily for consistent credits</li>
                <li>• Maintain login streaks for bonus rewards</li>
                <li>• Refer friends for large credit bonuses</li>
                <li>• Complete all available tasks</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}