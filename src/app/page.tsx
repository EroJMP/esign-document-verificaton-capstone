'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

export default function Home() {
  const router = useRouter();
  const { user, userRole, isLoading } = useAuth();
  
  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (userRole === 'admin') {
          router.push('/admin');
        } else {
          router.push('/student');
        }
      } else {
        router.push('/auth/login');
      }
    }
  }, [user, userRole, isLoading, router]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }
  
  return null;
}
