'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

export default function Unauthorized() {
  const router = useRouter();
  const { userRole } = useAuth();
  
  const goToDashboard = () => {
    if (userRole === 'admin') {
      router.push('/admin');
    } else if (userRole === 'student') {
      router.push('/student');
    } else {
      router.push('/');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center">
          <AlertTriangle className="h-16 w-16 text-red-500" />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
          Access Denied
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          You don&apos;t have permission to access this page.
        </p>
        <div className="mt-6">
          <button
            onClick={goToDashboard}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
} 