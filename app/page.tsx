// app/page.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Server, 
  Zap, 
  Shield, 
  Globe, 
  Coins, 
  Play, 
  Users,
  ArrowRight,
  CheckCircle
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto max-w-4xl">
          <Badge variant="secondary" className="mb-4">
            Free Minecraft Hosting
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Host Your Minecraft Server for Free
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create and manage your Minecraft servers with our innovative credit-based system. 
            Earn credits by watching ads and completing simple tasks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/auth/signin">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/earn">
                <Coins className="mr-2 h-4 w-4" />
                Learn About Credits
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose MinecraftHost?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We make Minecraft server hosting accessible to everyone through our unique credit system
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Coins className="h-6 w-6 mr-2 text-yellow-500" />
                  Completely Free
                </CardTitle>
                <CardDescription>
                  No upfront costs or hidden fees. Earn credits through ads and tasks.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Watch short video ads
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Click sponsored links
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Daily login bonuses
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-6 w-6 mr-2 text-blue-500" />
                  Instant Setup
                </CardTitle>
                <CardDescription>
                  Get your server running in minutes with our automated deployment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Multiple server software options
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Flexible RAM and storage
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    One-click server management
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-6 w-6 mr-2 text-green-500" />
                  Reliable & Secure
                </CardTitle>
                <CardDescription>
                  Enterprise-grade infrastructure with 99.9% uptime guarantee.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Automatic backups
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    DDoS protection
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    24/7 monitoring
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">
              Start hosting your Minecraft server in 3 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Sign Up & Earn Credits</h3>
              <p className="text-muted-foreground">
                Create your free account and start earning credits by watching ads or completing simple tasks.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Your Server</h3>
              <p className="text-muted-foreground">
                Choose your server software, allocate RAM and storage, then deploy with one click.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Start Playing!</h3>
              <p className="text-muted-foreground">
                Invite your friends and start playing on your very own Minecraft server.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple Credit Pricing</h2>
            <p className="text-xl text-muted-foreground">
              Transparent pricing with no hidden fees
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Server Resources</CardTitle>
                <CardDescription className="text-center">
                  Pay only for what you use with our credit system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <Server className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                    <h4 className="font-semibold">RAM</h4>
                    <p className="text-2xl font-bold text-primary">25 credits</p>
                    <p className="text-sm text-muted-foreground">per GB/month</p>
                  </div>
                  <div className="text-center">
                    <Globe className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <h4 className="font-semibold">Storage</h4>
                    <p className="text-2xl font-bold text-primary">2 credits</p>
                    <p className="text-sm text-muted-foreground">per GB/month</p>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h5 className="font-semibold mb-2">Example: Small Server</h5>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>2GB RAM</span>
                      <span>50 credits/month</span>
                    </div>
                    <div className="flex justify-between">
                      <span>10GB Storage</span>
                      <span>20 credits/month</span>
                    </div>
                    <div className="border-t pt-1 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>70 credits/month</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Your Minecraft Server?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of players already hosting with MinecraftHost
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/auth/signin">
                <Play className="mr-2 h-4 w-4" />
                Get Started Now
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/earn">
                <Users className="mr-2 h-4 w-4" />
                Learn More
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}