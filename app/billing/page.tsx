// app/billing/page.tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Coins, CreditCard, History, Zap } from 'lucide-react'

export default function BillingPage() {
  const { user: session } = useAuth()
  const [selectedPackage, setSelectedPackage] = useState('')

  const creditPackages = [
    { credits: 100, price: 1.99, popular: false },
    { credits: 500, price: 7.99, popular: true },
    { credits: 1000, price: 14.99, popular: false },
    { credits: 2500, price: 29.99, popular: false },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Billing & Credits</h1>
        <p className="text-muted-foreground">
          Manage your credits and purchase additional credits if needed
        </p>
      </div>

  {session && (
        <div className="mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Coins className="h-6 w-6 text-yellow-500" />
                  <span className="text-2xl font-bold">{session.credits || 0}</span>
                  <span className="text-muted-foreground">Credits Available</span>
                </div>
                <Button variant="outline" asChild>
                  <a href="/earn">Earn More Credits</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="purchase" className="space-y-6">
        <TabsList>
          <TabsTrigger value="purchase">Purchase Credits</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="purchase">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {creditPackages.map((pkg) => (
              <Card 
                key={pkg.credits} 
                className={`relative cursor-pointer transition-all hover:shadow-lg ${
                  pkg.popular ? 'border-primary shadow-md' : ''
                }`}
                onClick={() => setSelectedPackage(pkg.credits.toString())}
              >
                {pkg.popular && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center space-x-2">
                    <Coins className="h-5 w-5 text-yellow-500" />
                    <span>{pkg.credits}</span>
                  </CardTitle>
                  <CardDescription>Credits</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-2xl font-bold mb-2">${pkg.price}</div>
                  <div className="text-sm text-muted-foreground mb-4">
                    ${(pkg.price / pkg.credits * 100).toFixed(2)} per 100 credits
                  </div>
                  <Button 
                    className="w-full" 
                    variant={selectedPackage === pkg.credits.toString() ? 'default' : 'outline'}
                    disabled
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                Why Purchase Credits?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Instant Access</h4>
                  <p className="text-sm text-muted-foreground">
                    Get credits immediately without waiting for ads or tasks
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Support Development</h4>
                  <p className="text-sm text-muted-foreground">
                    Help us maintain and improve our hosting platform
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Premium Features</h4>
                  <p className="text-sm text-muted-foreground">
                    Access to higher resource limits and priority support
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="h-5 w-5 mr-2" />
                Transaction History
              </CardTitle>
              <CardDescription>Your recent credit transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Transactions Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Your transaction history will appear here once you start earning or purchasing credits
                </p>
                <Button variant="outline" asChild>
                  <a href="/earn">Start Earning Credits</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}