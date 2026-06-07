'use client';

import { useState } from 'react';
import { X, Mail, Shield, Send, AlertCircle } from 'lucide-react';

interface AdminInvitationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSendInvitation: (email: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export default function AdminInvitationDialog({ 
  isOpen, 
  onClose, 
  onSendInvitation, 
  isLoading, 
  error 
}: AdminInvitationDialogProps) {
  const [email, setEmail] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    try {
      await onSendInvitation(email.trim());
      setEmail(''); // Clear form on success
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const isValidEmail = (email: string) => {
    return email.includes('@') && email.includes('.');
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
              <h2 className="text-xl font-semibold text-gray-900">Invite New Admin</h2>
              <p className="text-sm text-gray-600">Send an invitation to join as administrator</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isLoading}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Info Section */}
          <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg mb-6">
            <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">How it works</h4>
              <ul className="mt-1 text-xs text-blue-700 space-y-1">
                <li>• An invitation email will be sent to the specified address</li>
                <li>• The recipient will receive a secure registration link</li>
                <li>• The invitation expires in 7 days</li>
                <li>• Only the invited email can complete the registration</li>
              </ul>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Invitation Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Admin Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    email && !isValidEmail(email) 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="admin@example.com"
                  disabled={isLoading}
                  autoFocus
                  required
                />
              </div>
              {email && !isValidEmail(email) && (
                <p className="mt-1 text-xs text-red-600">Please enter a valid email address</p>
              )}
            </div>

            {/* Security Notice */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Security Notice</h4>
                  <ul className="mt-1 text-xs text-yellow-700 space-y-1">
                    <li>• Only send invitations to trusted individuals</li>
                    <li>• The recipient will have full administrative access</li>
                    <li>• Invitations are tied to the specific email address</li>
                    <li>• You can revoke access later if needed</li>
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
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!email.trim() || !isValidEmail(email) || isLoading}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  email.trim() && isValidEmail(email) && !isLoading
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Send className="h-4 w-4" />
                    <span>Send Invitation</span>
                  </div>
                )}
              </button>
            </div>
          </form>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              The invitation will be sent immediately and expires in 7 days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
