'use client';

import { useState, useEffect } from 'react';
import { User, Edit3, Save, Eye, EyeOff, X } from 'lucide-react';
import OTPDialog from '../OTPDialog';

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
}

export default function MyAccountTab() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [originalProfileData, setOriginalProfileData] = useState({
    firstName: '',
    lastName: ''
  });
  
  // OTP-related state
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [isGeneratingOTP, setIsGeneratingOTP] = useState(false);
  const [pendingPasswordData, setPendingPasswordData] = useState<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  } | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Auto-disappear success messages after 5 seconds
  useEffect(() => {
    if (profileMessage?.type === 'success') {
      const timer = setTimeout(() => {
        setProfileMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [profileMessage]);

  useEffect(() => {
    if (passwordMessage?.type === 'success') {
      const timer = setTimeout(() => {
        setPasswordMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [passwordMessage]);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      
      // Fetch admin profile via API route
      const response = await fetch('/api/admin/profile');
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching admin profile:', errorData.error);
        return;
      }
      
      const userData = await response.json();
      
      setCurrentUser(userData);
      setProfileData({
        firstName: userData.first_name || '',
        lastName: userData.last_name || ''
      });
      setOriginalProfileData({
        firstName: userData.first_name || '',
        lastName: userData.last_name || ''
      });
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileEdit = () => {
    setIsEditingProfile(true);
  };

  const handleProfileCancel = () => {
    setIsEditingProfile(false);
    setProfileData(originalProfileData);
    setProfileMessage(null);
  };

  const handleProfileSave = async () => {
    if (!currentUser) return;

    try {
      setProfileLoading(true);
      setProfileMessage(null);

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: profileData.firstName,
          last_name: profileData.lastName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setProfileMessage({ type: 'error', text: result.error || 'Failed to update profile' });
        return;
      }

      setOriginalProfileData(profileData);
      setIsEditingProfile(false);
      setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
      
      // Refresh user data
      await fetchCurrentUser();
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Current password is required' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      return;
    }

    try {
      setIsGeneratingOTP(true);
      setPasswordMessage(null);

      // Store the password data for later use
      setPendingPasswordData({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
      });

      // Generate and send OTP
      const response = await fetch('/api/auth/generate-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setPasswordMessage({ type: 'error', text: result.error || 'Failed to generate verification code' });
        return;
      }

      // Show OTP dialog
      setShowOTPDialog(true);
      setPasswordMessage({ type: 'success', text: 'Verification code sent to your email' });

    } catch (error) {
      console.error('Error generating OTP:', error);
      setPasswordMessage({ type: 'error', text: 'Failed to generate verification code' });
    } finally {
      setIsGeneratingOTP(false);
    }
  };

  const handleOTPVerify = async (otpCode: string) => {
    if (!pendingPasswordData) {
      setPasswordMessage({ type: 'error', text: 'No pending password change found' });
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordMessage(null);

      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          otpCode,
          newPassword: pendingPasswordData.newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setPasswordMessage({ type: 'error', text: result.error || 'Failed to verify code' });
        return;
      }

      // Success - clear form and close dialog
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPendingPasswordData(null);
      setShowOTPDialog(false);
      setPasswordMessage({ type: 'success', text: 'Password updated successfully' });

    } catch (error) {
      console.error('Error verifying OTP:', error);
      setPasswordMessage({ type: 'error', text: 'Failed to verify code' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleOTPDialogClose = () => {
    setShowOTPDialog(false);
    setPendingPasswordData(null);
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No user data found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Unable to load your account information.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Password Change Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Change Password</h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
              Current Password
            </label>
            <div className="mt-1 relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                id="currentPassword"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="block w-full px-3 py-3 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Enter current password"
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPasswords.current ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <div className="mt-1 relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                id="newPassword"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="block w-full px-3 py-3 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Enter new password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPasswords.new ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <div className="mt-1 relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                id="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="block w-full px-3 py-3 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Confirm new password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPasswords.confirm ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <button
            onClick={handlePasswordChange}
            disabled={isGeneratingOTP || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {isGeneratingOTP ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isGeneratingOTP ? 'Sending Code...' : 'Update Password'}
          </button>
        </div>

        {passwordMessage && (
          <div className={`mt-4 p-3 rounded-md ${
            passwordMessage.type === 'success' 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {passwordMessage.text}
          </div>
        )}
      </div>

      {/* Profile Information Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 self-start">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
          {!isEditingProfile && (
            <button
              onClick={handleProfileEdit}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-600 hover:text-green-700"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Profile
            </button>
          )}
        </div>

        {isEditingProfile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Enter your first name"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Enter your last name"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleProfileSave}
                disabled={profileLoading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {profileLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </button>
              <button
                onClick={handleProfileCancel}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <p className="mt-1 text-sm text-gray-900">{currentUser.first_name || 'Not set'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <p className="mt-1 text-sm text-gray-900">{currentUser.last_name || 'Not set'}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-sm text-gray-900">{currentUser.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <p className="mt-1 text-sm text-gray-900 capitalize">{currentUser.role}</p>
            </div>
          </div>
        )}

        {profileMessage && (
          <div className={`mt-4 p-3 rounded-md ${
            profileMessage.type === 'success' 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {profileMessage.text}
          </div>
        )}
      </div>

      {/* OTP Dialog */}
      <OTPDialog
        isOpen={showOTPDialog}
        onClose={handleOTPDialogClose}
        onVerify={handleOTPVerify}
        email={currentUser?.email || ''}
        isLoading={passwordLoading}
        error={passwordMessage?.type === 'error' ? passwordMessage.text : null}
      />
    </div>
  );
}
