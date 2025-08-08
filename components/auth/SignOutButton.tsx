'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function SignOutButton() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
      });
      
      await refreshUser();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
    >
      Sign Out
    </button>
  );
}