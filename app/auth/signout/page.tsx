'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const SignOutPage = () => {
  useEffect(() => {
    // Auto sign out after 3 seconds
    const timer = setTimeout(() => {
      signOut({ callbackUrl: '/' });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <LogOut className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Sign Out</CardTitle>
          <CardDescription>
            You are being signed out of your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">
              Signing you out securely...
            </p>
          </div>

          <div className="flex flex-col space-y-2">
            <Button onClick={handleSignOut} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out Now
            </Button>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </Link>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              You will be redirected automatically in a few seconds
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignOutPage;