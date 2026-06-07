'use client';

import { useState, useEffect } from 'react';
import { User, Save, Eye, EyeOff, Edit, X, Upload, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import OTPDialog from '@/components/OTPDialog';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'account'>('account');
  const [currentUser, setCurrentUser] = useState<any>(null);
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
  
  // Parent ID picture state
  const [parentIdPicture, setParentIdPicture] = useState<File | null>(null);
  const [parentIdPicturePreview, setParentIdPicturePreview] = useState<string | null>(null);
  const [parentIdPictureUrl, setParentIdPictureUrl] = useState<string | null>(null);
  const [parentIdUploading, setParentIdUploading] = useState(false);
  const [parentIdMessage, setParentIdMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isParentIdDragOver, setIsParentIdDragOver] = useState(false);
  
  // OTP-related state
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [isGeneratingOTP, setIsGeneratingOTP] = useState(false);
  const [pendingPasswordData, setPendingPasswordData] = useState<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  } | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchUserData() {
      try {
        // Fetch user profile data from API route
        const response = await fetch('/api/student/profile');
        
        if (!response.ok) {
          console.error('Failed to fetch user profile:', response.status);
          setLoading(false);
          return;
        }
        
        const userData = await response.json();
        
        // Set the user data
        setCurrentUser(userData);
        
        // Set profile form data
        const profileFormData = {
          firstName: userData.first_name || '',
          lastName: userData.last_name || ''
        };
        setProfileData(profileFormData);
        setOriginalProfileData(profileFormData);
        
        // Set parent ID picture URL if exists
        if (userData.parent_id_picture_url) {
          setParentIdPictureUrl(userData.parent_id_picture_url);
          // Construct public URL
          const { data } = supabase.storage
            .from('parent-id-pictures')
            .getPublicUrl(userData.parent_id_picture_url);
          setParentIdPicturePreview(data.publicUrl);
        }
        
      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserData();
  }, []); // Empty dependency array - only run once on mount

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

  useEffect(() => {
    if (parentIdMessage?.type === 'success') {
      const timer = setTimeout(() => {
        setParentIdMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [parentIdMessage]);

  const handleEditProfile = () => {
    setIsEditingProfile(true);
    setProfileMessage(null);
  };

  const handleCancelEdit = () => {
    setProfileData(originalProfileData);
    setIsEditingProfile(false);
    setProfileMessage(null);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileData.firstName.trim() || !profileData.lastName.trim()) {
      setProfileMessage({ type: 'error', text: 'First name and last name are required' });
      return;
    }
    
    setProfileLoading(true);
    setProfileMessage(null);
    
    try {
      // Update user profile via API route
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: profileData.firstName.trim(),
          last_name: profileData.lastName.trim()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
      
      const result = await response.json();
      
      // Update local state
      setCurrentUser((prev: any) => ({
        ...prev,
        first_name: profileData.firstName.trim(),
        last_name: profileData.lastName.trim()
      }));
      
      // Update original data and exit edit mode
      setOriginalProfileData({
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim()
      });
      setIsEditingProfile(false);
      setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (err: any) {
      console.error('Profile update error:', err);
      setProfileMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

  const processFile = (file: File) => {
    setParentIdMessage(null);

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setParentIdMessage({ type: 'error', text: 'Please upload a valid image file (PNG, JPEG, JPG, or WEBP)' });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setParentIdMessage({ type: 'error', text: 'File size must be less than 10MB' });
      return;
    }

    setParentIdPicture(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setParentIdPicturePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleParentIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleParentIdDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsParentIdDragOver(true);
  };

  const handleParentIdDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsParentIdDragOver(false);
  };

  const handleParentIdDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsParentIdDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      processFile(file);
    }
  };

  const handleParentIdSubmit = async () => {
    if (!parentIdPicture) {
      setParentIdMessage({ type: 'error', text: 'Please select a file to upload' });
      return;
    }

    setParentIdUploading(true);
    setParentIdMessage(null);

    try {
      const formData = new FormData();
      formData.append('parentIdPicture', parentIdPicture);

      const response = await fetch('/api/student/profile/parent-id', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload parent ID picture');
      }

      // Update local state
      setParentIdPictureUrl(data.url);
      setParentIdPicturePreview(data.publicUrl);
      setParentIdPicture(null);
      setParentIdMessage({ type: 'success', text: 'Parent ID picture uploaded successfully' });
      
      // Update currentUser state
      setCurrentUser((prev: any) => ({
        ...prev,
        parent_id_picture_url: data.url
      }));

    } catch (error: any) {
      console.error('Parent ID upload error:', error);
      setParentIdMessage({ type: 'error', text: error.message || 'Failed to upload parent ID picture' });
    } finally {
      setParentIdUploading(false);
    }
  };

  const handleRemoveParentIdPreview = () => {
    setParentIdPicture(null);
    if (parentIdPictureUrl) {
      const { data } = supabase.storage
        .from('parent-id-pictures')
        .getPublicUrl(parentIdPictureUrl);
      setParentIdPicturePreview(data.publicUrl);
    } else {
      setParentIdPicturePreview(null);
    }
    setParentIdMessage(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
        <p className="text-sm text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Settings</h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-600">
              Manage your account settings and preferences
            </p>
          </div>
          <button
            onClick={() => router.push('/student')}
            className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-green-500 hover:text-green-700 flex-shrink-0 whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Home
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Change Password Section */}
          <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6 h-fit">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-1 sm:mb-2">Change Password</h2>
              <p className="text-xs sm:text-sm text-gray-600">
                Update your password to keep your account secure
              </p>
            </div>

            {passwordMessage && (
              <div className={`mb-4 p-4 rounded-md ${
                passwordMessage.type === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {passwordMessage.text}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div>
                <label htmlFor="currentPassword" className="block text-xs sm:text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <div className="mt-1 relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    id="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="block w-full px-3 py-2.5 sm:py-3 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm sm:text-base"
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => togglePasswordVisibility('current')}
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
                <label htmlFor="newPassword" className="block text-xs sm:text-sm font-medium text-gray-700">
                  New Password
                </label>
                <div className="mt-1 relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    id="newPassword"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="block w-full px-3 py-2.5 sm:py-3 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm sm:text-base"
                    placeholder="Enter new password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => togglePasswordVisibility('new')}
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
                <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <div className="mt-1 relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    id="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="block w-full px-3 py-2.5 sm:py-3 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm sm:text-base"
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => togglePasswordVisibility('confirm')}
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isGeneratingOTP}
                  className={`inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white ${
                    isGeneratingOTP
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                  }`}
                >
                  {isGeneratingOTP ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-1.5 sm:mr-2"></div>
                      <span className="text-xs sm:text-sm">Sending Code...</span>
                    </>
                  ) : (
                    <>
                      <Save className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="text-xs sm:text-sm">Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Personal Information and Parent ID */}
          <div className="space-y-6">
            {/* Personal Information Section */}
            <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
            <div className="mb-4 sm:mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-1 sm:mb-2">Personal Information</h2>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Update your name and personal details
                  </p>
                </div>
                {!isEditingProfile && (
                  <button
                    onClick={handleEditProfile}
                    className="inline-flex items-center px-2.5 py-1.5 sm:px-3 sm:py-2 border border-gray-300 shadow-sm text-xs sm:text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Edit className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">Edit</span>
                  </button>
                )}
              </div>
            </div>

            {profileMessage && (
              <div className={`mb-4 p-4 rounded-md ${
                profileMessage.type === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {profileMessage.text}
              </div>
            )}

            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-xs sm:text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <div className="mt-1">
                     <input
                       type="text"
                       id="firstName"
                       value={profileData.firstName}
                       onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                       disabled={!isEditingProfile}
                       className={`block w-full px-3 py-2.5 sm:py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm sm:text-base ${
                         !isEditingProfile ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
                       }`}
                       placeholder="Enter your first name"
                       required
                     />
                  </div>
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-xs sm:text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <div className="mt-1">
                     <input
                       type="text"
                       id="lastName"
                       value={profileData.lastName}
                       onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                       disabled={!isEditingProfile}
                       className={`block w-full px-3 py-2.5 sm:py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm sm:text-base ${
                         !isEditingProfile ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
                       }`}
                       placeholder="Enter your last name"
                       required
                     />
                  </div>
                </div>
              </div>

              {isEditingProfile && (
                <div className="flex justify-end space-x-2 sm:space-x-3">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 shadow-sm text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <X className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">Cancel</span>
                  </button>
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className={`inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white ${
                      profileLoading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                    }`}
                  >
                    {profileLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-1.5 sm:mr-2"></div>
                        <span className="text-xs sm:text-sm">Updating...</span>
                      </>
                    ) : (
                      <>
                        <Save className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="text-xs sm:text-sm">Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
            </div>

            {/* Parent ID Picture Section */}
            <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-1 sm:mb-2">Parent ID Picture</h2>
              <p className="text-xs sm:text-sm text-gray-600">
                Upload or update your parent's ID picture with signature
              </p>
            </div>

            {parentIdMessage && (
              <div className={`mb-4 p-4 rounded-md ${
                parentIdMessage.type === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {parentIdMessage.text}
              </div>
            )}

            <div className="space-y-4">
              {parentIdPicturePreview ? (
                <div className="relative">
                  <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                    <div className="flex flex-col items-center space-y-4">
                      <img
                        src={parentIdPicturePreview}
                        alt="Parent ID Preview"
                        className="max-w-full h-auto max-h-64 object-contain rounded-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => document.getElementById('parent-id-upload')?.click()}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {parentIdPicture ? 'Change Picture' : 'Update Picture'}
                        </button>
                        {parentIdPicture && (
                          <button
                            type="button"
                            onClick={handleRemoveParentIdPreview}
                            className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <input
                    id="parent-id-upload"
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleParentIdUpload}
                  />
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="parent-id-upload"
                    onDragOver={handleParentIdDragOver}
                    onDragLeave={handleParentIdDragLeave}
                    onDrop={handleParentIdDrop}
                    className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      isParentIdDragOver
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImageIcon className="w-10 h-10 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPEG, JPG, or WEBP (MAX. 10MB)</p>
                    </div>
                    <input
                      id="parent-id-upload"
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleParentIdUpload}
                    />
                  </label>
                </div>
              )}

              {parentIdPicture && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleParentIdSubmit}
                    disabled={parentIdUploading}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                      parentIdUploading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                    }`}
                  >
                    {parentIdUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Upload Parent ID
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            </div>
          </div>
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
