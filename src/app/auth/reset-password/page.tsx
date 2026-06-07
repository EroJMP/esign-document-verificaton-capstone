'use client';

import { useState, Suspense, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PasswordInput from '@/components/PasswordInput';
import { ArrowLeft, Mail } from 'lucide-react';

function ResetPasswordForm() {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'email' | 'otp' | 'password'>('email');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  
  const router = useRouter();

  // Password validation
  const validatePassword = (showErrors = false) => {
    let isValid = true;
    
    if (showErrors || hasAttemptedSubmit) {
      // Validate password match
      if (newPassword !== confirmPassword) {
        isValid = false;
      }
      
      // Validate strong password requirements
      const hasUpperCase = /[A-Z]/.test(newPassword);
      const hasLowerCase = /[a-z]/.test(newPassword);
      const hasNumbers = /\d/.test(newPassword);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>-_=+]/.test(newPassword);
      const hasMinLength = newPassword.length >= 8;
      
      if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        isValid = false;
      }
    }
    
    return isValid;
  };

  // Memoized validation result
  const isPasswordValid = useMemo(() => {
    return validatePassword(false);
  }, [newPassword, confirmPassword, hasAttemptedSubmit]);

  // Handle email submission
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'request',
          email
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset code');
      }
      
      setCurrentStep('otp');
      setSuccessMessage('Password reset code sent to your email');
      
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP submission
  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'verify',
          email,
          otpCode
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }
      
      setCurrentStep('password');
      setSuccessMessage('Code verified successfully');
      
    } catch (error: any) {
      setError(error.message || 'An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  // Handle password update
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setHasAttemptedSubmit(true);
    
    if (!validatePassword(true)) {
      setError('Please fix the password requirements');
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'update',
          email,
          otpCode,
          newPassword
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }
      
      setSuccessMessage('Password updated successfully! Redirecting to login...');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
      
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP functionality
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    
    setIsResending(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'request',
          email
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend reset code');
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
      
      setSuccessMessage('New password reset code sent to your email');
      
    } catch (error: any) {
      setError(error.message || 'Failed to resend reset code');
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

  const handleOTPInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(value);
  };

  const handleBackToEmail = () => {
    setCurrentStep('email');
    setError(null);
    setSuccessMessage(null);
    setOtpCode('');
  };

  const handleBackToOTP = () => {
    setCurrentStep('otp');
    setError(null);
    setSuccessMessage(null);
    setNewPassword('');
    setConfirmPassword('');
  };

  // Auto-hide messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [error]);
  
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
              {currentStep === 'email' && 'Reset Password'}
              {currentStep === 'otp' && 'Verify Your Email'}
              {currentStep === 'password' && 'Set New Password'}
            </h2>
            <p className="text-gray-600">
              {currentStep === 'email' && 'Enter your email address to receive a reset code'}
              {currentStep === 'otp' && 'Enter the verification code sent to your email'}
              {currentStep === 'password' && 'Create a new password for your account'}
            </p>
            {currentStep === 'email' && (
              <p className="mt-4 text-sm text-gray-600">
                Remember your password?{' '}
                <Link href="/auth/login" className="font-semibold text-green-600 hover:text-green-500 transition-colors">
                  Sign in here
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
            </div>
          )}
          
          <form className="space-y-6" onSubmit={
            currentStep === 'email' ? handleEmailSubmit :
            currentStep === 'otp' ? handleOTPSubmit :
            handlePasswordUpdate
          }>
            {/* Step 1: Email Input */}
            {currentStep === 'email' && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors placeholder-gray-400"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}

            {/* Step 2: OTP Verification */}
            {currentStep === 'otp' && (
              <div className="space-y-6">
                {/* Simple Email Display */}
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Password reset code sent to:</p>
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
              </div>
            )}

            {/* Step 3: New Password */}
            {currentStep === 'password' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <PasswordInput
                    id="newPassword"
                    name="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    autoComplete="new-password"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    autoComplete="new-password"
                    required
                  />
                </div>

                {/* Password Requirements - Show when user starts typing */}
                {(newPassword || confirmPassword) && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-800 mb-2">Password Requirements:</h4>
                    <ul className="text-xs text-gray-700 space-y-1">
                      <li className={newPassword.length >= 8 ? 'text-green-600' : ''}>
                        • At least 8 characters {newPassword.length >= 8 && '✓'}
                      </li>
                      <li className={/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}>
                        • At least one uppercase letter {/[A-Z]/.test(newPassword) && '✓'}
                      </li>
                      <li className={/[a-z]/.test(newPassword) ? 'text-green-600' : ''}>
                        • At least one lowercase letter {/[a-z]/.test(newPassword) && '✓'}
                      </li>
                      <li className={/\d/.test(newPassword) ? 'text-green-600' : ''}>
                        • At least one number {/\d/.test(newPassword) && '✓'}
                      </li>
                      <li className={/[!@#$%^&*(),.?":{}|<>-_=+]/.test(newPassword) ? 'text-green-600' : ''}>
                        • At least one special character {/[!@#$%^&*(),.?":{}|<>-_=+]/.test(newPassword) && '✓'}
                      </li>
                      <li className={newPassword === confirmPassword && newPassword ? 'text-green-600' : ''}>
                        • Passwords must match {newPassword === confirmPassword && newPassword && '✓'}
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex space-x-3">
              {currentStep !== 'email' && (
                <button
                  type="button"
                  onClick={currentStep === 'otp' ? handleBackToEmail : handleBackToOTP}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
              )}
              
              <button
                type="submit"
                disabled={
                  loading ||
                  (currentStep === 'email' && !email) ||
                  (currentStep === 'otp' && otpCode.length !== 6) ||
                  (currentStep === 'password' && !isPasswordValid)
                }
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  !loading &&
                  ((currentStep === 'email' && email) ||
                   (currentStep === 'otp' && otpCode.length === 6) ||
                   (currentStep === 'password' && isPasswordValid))
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>
                      {currentStep === 'email' && 'Sending...'}
                      {currentStep === 'otp' && 'Verifying...'}
                      {currentStep === 'password' && 'Updating...'}
                    </span>
                  </div>
                ) : (
                  <>
                    {currentStep === 'email' && 'Send Reset Code'}
                    {currentStep === 'otp' && 'Verify'}
                    {currentStep === 'password' && 'Update Password'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
