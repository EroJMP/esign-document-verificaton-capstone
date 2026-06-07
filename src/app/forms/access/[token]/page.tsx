'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';
import ConcernSuggestionModal from '@/components/student/ConcernSuggestionModal';

type Form = {
  id: string;
  title: string;
  description: string | null;
  status: string;
};

export default function FormAccess({ params }: { params: Promise<{ token: string }> }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [accessGranted, setAccessGranted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const router = useRouter();
  const unwrappedParams = use(params);
  
  useEffect(() => {
    verifyAccessToken();
  }, [unwrappedParams.token]);
  
  const verifyAccessToken = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/forms/access/${unwrappedParams.token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify access token');
      }
      
      const data = await response.json();
      setForm(data.form);
      setAccessGranted(true);
      
      // If the user is authenticated, redirect to the form with access token
      if (data.authenticated) {
        setRedirecting(true);
        setTimeout(() => {
          router.push(`/student/forms/${data.form.id}?accessToken=${unwrappedParams.token}`);
        }, 2000);
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while verifying the access token');
      setAccessGranted(false);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative bg-gray-800">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/background.png)',
          }}
        ></div>
        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/40 to-gray-900/60"></div>
        
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
            <div className="flex flex-col items-center">
              <Loader className="mb-4 h-12 w-12 animate-spin text-green-600" />
              <h1 className="text-xl font-semibold">Verifying Access</h1>
              <p className="mt-2 text-center text-gray-600">
                Please wait while we verify your access to this form...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !accessGranted) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative bg-gray-800">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/background.png)',
          }}
        ></div>
        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/40 to-gray-900/60"></div>
        
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
            <div className="flex flex-col items-center">
              <AlertCircle className="mb-4 h-12 w-12 text-red-600" />
              <h1 className="text-xl font-semibold">Access Denied</h1>
              <p className="mt-2 text-center text-gray-600">
                {error || 'The access link you provided is invalid or has expired.'}
              </p>
              <p className="mt-3 text-center text-sm text-gray-500">
                If you believe this is an error, please contact the administration{' '}
                or{' '}
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-green-600 hover:text-green-700 underline font-medium"
                >
                  submit a concern ticket
                </button>
                .
              </p>
              <div className="mt-6">
                <Link
                  href="/"
                  className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Concern/Suggestion Modal */}
        <ConcernSuggestionModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      </div>
    );
  }
  
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative bg-gray-800">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/background.png)',
          }}
        ></div>
        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/40 to-gray-900/60"></div>
        
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
            <div className="flex flex-col items-center">
              <CheckCircle className="mb-4 h-12 w-12 text-green-600" />
              <h1 className="text-xl font-semibold">Access Granted</h1>
              <p className="mt-2 text-center text-gray-600">
                You are being redirected to the form...
              </p>
              <div className="mt-4 w-full rounded-full bg-gray-200">
                <div className="animate-pulse rounded-full bg-green-600 p-1"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative bg-gray-800">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/background.png)',
        }}
      ></div>
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/40 to-gray-900/60"></div>
      
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center">
            <CheckCircle className="mb-4 h-12 w-12 text-green-600" />
            <h1 className="text-xl font-semibold">Access Granted</h1>
            <p className="mt-2 text-center text-gray-600">
              You have access to the following form:
            </p>
            <div className="mt-4 w-full rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h2 className="text-lg font-medium">{form?.title}</h2>
              {form?.description && <p className="mt-1 text-gray-600">{form.description}</p>}
            </div>
            
            <div className="mt-6 space-y-4">
              <p className="text-center text-gray-600">
                To access this form, please log in or create an account.
              </p>
              <div className="flex flex-col space-y-2">
                <Link
                  href={`/auth/login?redirect=/student/forms/${form?.id}&accessToken=${unwrappedParams.token}`}
                  prefetch={false}
                  className="inline-flex w-full justify-center rounded-md bg-green-600 px-4 py-2 text-center text-white hover:bg-green-700"
                >
                  Log In
                </Link>
                <Link
                  href={`/auth/register?redirect=/student/forms/${form?.id}&accessToken=${unwrappedParams.token}`}
                  prefetch={false}
                  className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-gray-700 hover:bg-gray-50"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 