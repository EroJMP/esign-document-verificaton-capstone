'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PasswordInput from '@/components/PasswordInput';
import { Mail, Clock, Shield, ArrowLeft } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSignedOut, setJustSignedOut] = useState(false);
  const [currentStep, setCurrentStep] = useState<'credentials' | 'otp'>('credentials');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirect') || '/';
  const accessToken = searchParams?.get('accessToken');
  const signedOut = searchParams?.get('signedOut') === 'true';
  
  useEffect(() => {
    // If user just signed out, set flag to prevent automatic redirect
    if (signedOut) {
      setJustSignedOut(true);
    }
  }, [signedOut]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          step: 'credentials'
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      if (data.step === 'otp') {
        setCurrentStep('otp');
        setSuccessMessage(data.message);
      } else {
        handleSuccessfulLogin(data.role);
      }
      
    } catch (error: any) {
      setError(error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          otpCode,
          step: 'otp'
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }
      
      if (data.step === 'complete') {
        handleSuccessfulLogin(data.role);
      }
      
    } catch (error: any) {
      setError(error.message || 'An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessfulLogin = (role: string) => {
    if (redirectTo !== '/') {
      // Preserve accessToken parameter if it exists
      const redirectUrl = new URL(redirectTo, window.location.origin);
      if (accessToken) {
        redirectUrl.searchParams.set('accessToken', accessToken);
      }
      router.push(redirectUrl.toString());
    } else if (role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/student');
    }
  };

  const handleBackToCredentials = () => {
    setCurrentStep('credentials');
    setError(null);
    setSuccessMessage(null);
    setOtpCode('');
  };

  const handleOTPInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(value);
  };

  // Resend OTP functionality
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    
    setIsResending(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          step: 'credentials'
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification code');
      }
      
      // Start 10-minute countdown
      setResendCooldown(600); // 10 minutes in seconds
      
      // Countdown timer
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      setSuccessMessage('New verification code sent to your email');
      
    } catch (error: any) {
      setError(error.message || 'Failed to resend verification code');
    } finally {
      setIsResending(false);
    }
  };

  // Format countdown time
  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Auto-hide error message after 10 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  
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
      
      <div className="relative z-10 max-w-md w-full">
        {/* Modern Container */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-30 w-30 object-contain"
            />
          </div>
          
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {currentStep === 'credentials' ? 'Welcome Back' : 'Verify Your Identity'}
            </h2>
            <p className="text-gray-600">
              {currentStep === 'credentials' ? 'Sign in to your account' : 'Enter the verification code sent to your email'}
            </p>
            {currentStep === 'credentials' && (
              <p className="mt-4 text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <Link href="/auth/register" prefetch={false} className="font-semibold text-green-600 hover:text-green-500 transition-colors">
                  Register here
                </Link>
              </p>
            )}
          </div>
          
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700 text-center">{successMessage}</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 text-center">{error}</p>
              {error.includes('rate limit') && (
                <p className="text-xs text-center mt-2">
                  <a 
                    href="/reset_rate_limit.html" 
                    target="_blank" 
                    className="text-green-600 hover:text-green-800 underline"
                  >
                    Click here for instructions to reset rate limit
                  </a>
                </p>
              )}
            </div>
          )}
          
          {currentStep === 'credentials' ? (
            <form className="space-y-6" onSubmit={handleCredentialsSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors placeholder-gray-400"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <PasswordInput
                    id="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-center">
                <Link href="/auth/reset-password" className="text-sm font-medium text-green-600 hover:text-green-500 transition-colors">
                  Forgot your password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleOTPSubmit}>
              {/* Simple Email Display */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Verification code sent to:</p>
                <p className="text-sm font-medium text-gray-900">{email}</p>
              </div>

              {/* OTP Input */}
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter 6-digit verification code
                </label>
                <input
                  type="text"
                  id="otp"
                  value={otpCode}
                  onChange={handleOTPInputChange}
                  className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="000000"
                  maxLength={6}
                  disabled={loading}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleBackToCredentials}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={otpCode.length !== 6 || loading}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    otpCode.length === 6 && !loading
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    'Verify'
                  )}
                </button>
              </div>

              {/* Help Text with Resend */}
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-2">
                  Didn't receive the code? Check your spam folder or{' '}
                  {resendCooldown > 0 ? (
                    <span className="text-gray-400">
                      resend in {formatCountdown(resendCooldown)}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={isResending}
                      className="text-green-600 hover:text-green-700 underline font-medium disabled:opacity-50"
                    >
                      {isResending ? 'Sending...' : 'resend'}
                    </button>
                  )}
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
} 