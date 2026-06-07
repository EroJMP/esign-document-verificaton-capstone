'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignOut() {
  const router = useRouter();

  useEffect(() => {
    const performSignOut = async () => {
      try {
        // Call our server API endpoint to handle signout
        const response = await fetch('/api/auth/signout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to sign out');
        }
      } catch (error) {
        console.error('Error during sign out:', error);
      } finally {
        // Always redirect to login page
        window.location.href = '/auth/login?signedOut=true';
      }
    };

    performSignOut();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-4 text-center text-2xl font-bold">Signing out...</h1>
        <p className="text-center text-gray-600">Please wait while we sign you out.</p>
      </div>
    </div>
  );
} 