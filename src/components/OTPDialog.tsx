'use client';

import { useState } from 'react';
import { X, Mail, Clock, Shield } from 'lucide-react';

interface OTPDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (otpCode: string) => Promise<void>;
  email: string;
  isLoading: boolean;
  error: string | null;
}

export default function OTPDialog({ 
  isOpen, 
  onClose, 
  onVerify, 
  email, 
  isLoading, 
  error 
}: OTPDialogProps) {
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) return;
    
    setIsVerifying(true);
    try {
      await onVerify(otpCode);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-full">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Verify Your Identity</h2>
              <p className="text-sm text-gray-600">Enter the code sent to your email</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isVerifying}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Email Info */}
          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg mb-6">
            <Mail className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">Verification code sent to:</p>
              <p className="text-sm text-blue-700">{email}</p>
            </div>
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Clock className="h-4 w-4 text-gray-500" />
            <p className="text-sm text-gray-600">Code expires in 10 minutes</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* OTP Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                Enter 6-digit verification code
              </label>
              <input
                type="text"
                id="otp"
                value={otpCode}
                onChange={handleInputChange}
                className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="000000"
                maxLength={6}
                disabled={isVerifying}
                autoComplete="one-time-code"
                autoFocus
              />
            </div>

            {/* Security Notice */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Security Notice</h4>
                  <ul className="mt-1 text-xs text-yellow-700 space-y-1">
                    <li>• This code is valid for 10 minutes only</li>
                    <li>• Do not share this code with anyone</li>
                    <li>• If you didn't request this, please ignore</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isVerifying}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={otpCode.length !== 6 || isVerifying}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  otpCode.length === 6 && !isVerifying
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isVerifying ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  'Verify & Update Password'
                )}
              </button>
            </div>
          </form>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Didn't receive the code? Check your spam folder or try again.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
