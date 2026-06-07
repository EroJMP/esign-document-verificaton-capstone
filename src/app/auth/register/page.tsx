'use client';

import { useState, Suspense, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { DEPARTMENTS, getCoursesByDepartment, validateEmailDomain, validateStudentId } from '@/lib/department-courses';
import PasswordInput from '@/components/PasswordInput';
import { Mail, Clock, Shield, ArrowLeft, Upload, X, Image as ImageIcon } from 'lucide-react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirect') || '/';
  const accessToken = searchParams.get('accessToken') || searchParams.get('access_token');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [collegeDepartment, setCollegeDepartment] = useState('');
  const [course, setCourse] = useState('');
  const [yearSection, setYearSection] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [parentIdPicture, setParentIdPicture] = useState<File | null>(null);
  const [parentIdPicturePreview, setParentIdPicturePreview] = useState<string | null>(null);
  const [parentIdPictureUrl, setParentIdPictureUrl] = useState<string | null>(null);
  const [parentIdError, setParentIdError] = useState<string | null>(null);
  const [isParentIdDragOver, setIsParentIdDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [studentIdError, setStudentIdError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [yearSectionError, setYearSectionError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'personal' | 'academic' | 'password' | 'parent-id' | 'otp'>('personal');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Step-specific validation functions
  const validatePersonalStep = (showErrors = false) => {
    let isValid = true;
    
    // Clear previous errors
    setEmailError(null);
    setStudentIdError(null);
    
    // Only show errors if user has attempted to submit or showErrors is true
    if (showErrors || hasAttemptedSubmit) {
      // Validate email domain
      if (!validateEmailDomain(email)) {
        setEmailError('Email must end with @plpasig.edu.ph');
        isValid = false;
      }
      
      // Validate student ID
      if (!validateStudentId(studentId)) {
        setStudentIdError('Student ID must be 5-20 characters long and contain only letters, numbers, and hyphens');
        isValid = false;
      }
    }
    
    // Validate required fields
    if (!firstName.trim()) {
      isValid = false;
    }
    if (!lastName.trim()) {
      isValid = false;
    }
    
    return isValid;
  };

  const validateYearSection = (value: string): boolean => {
    // Format: (1st|2nd|3rd|4th) Year - [A-Z] (single alphabet character only)
    const pattern = /^(1st|2nd|3rd|4th) Year - [A-Z]$/;
    return pattern.test(value.trim());
  };

  const validateAcademicStep = (showErrors = false) => {
    let isValid = true;
    
    // Only show errors if user has attempted to submit or showErrors is true
    if (showErrors || hasAttemptedSubmit) {
      // Validate year section format (only set error, don't clear if we're not validating)
      if (!yearSection.trim()) {
        setYearSectionError('Year & Section is required');
        isValid = false;
      } else if (!validateYearSection(yearSection)) {
        setYearSectionError('Invalid Format (e.g., 4th Year - A)' );
        isValid = false;
      } else {
        // Only clear error if validation passes AND we're actively validating
        if (showErrors) {
          setYearSectionError(null);
        }
      }
    }
    
    // Validate required fields (for form submission, but don't show errors for other fields here)
    if (!collegeDepartment) {
      isValid = false;
    }
    if (!course) {
      isValid = false;
    }
    if (!yearSection.trim()) {
      isValid = false;
    }
    
    return isValid;
  };

  const validatePasswordStep = (showErrors = false) => {
    let isValid = true;
    
    // Clear previous errors
    setPasswordError(null);
    
    // Only show errors if user has attempted to submit or showErrors is true
    if (showErrors || hasAttemptedSubmit) {
      // Validate password match
      if (password !== confirmPassword) {
        setPasswordError('Passwords do not match');
        isValid = false;
        return isValid;
      }
      
      // Validate strong password requirements
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>-_=+]/.test(password);
      const hasMinLength = password.length >= 8;
      
      if (!hasMinLength) {
        setPasswordError('Password must be at least 8 characters long');
        isValid = false;
      } else if (!hasUpperCase) {
        setPasswordError('Password must contain at least one uppercase letter');
        isValid = false;
      } else if (!hasLowerCase) {
        setPasswordError('Password must contain at least one lowercase letter');
        isValid = false;
      } else if (!hasNumbers) {
        setPasswordError('Password must contain at least one number');
        isValid = false;
      } else if (!hasSpecialChar) {
        setPasswordError('Password must contain at least one special character');
        isValid = false;
      }
    }
    
    return isValid;
  };

  const validateParentIdStep = (showErrors = false) => {
    let isValid = true;
    
    // Clear previous errors
    setParentIdError(null);
    
    // Only show errors if user has attempted to submit or showErrors is true
    if (showErrors || hasAttemptedSubmit) {
      if (!parentIdPicture) {
        setParentIdError('Parent ID picture is required');
        isValid = false;
      } else {
        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!validTypes.includes(parentIdPicture.type)) {
          setParentIdError('Please upload a valid image file (PNG, JPEG, JPG, or WEBP)');
          isValid = false;
        }
        // Validate file size (10MB limit)
        else if (parentIdPicture.size > 10 * 1024 * 1024) {
          setParentIdError('File size must be less than 10MB');
          isValid = false;
        }
      }
    }
    
    return isValid;
  };

  // Handle department change
  const handleDepartmentChange = (selectedDepartment: string) => {
    setCollegeDepartment(selectedDepartment);
    setCourse(''); // Reset course when department changes
  };
  
  // Navigation functions
  const handleNextStep = async () => {
    setError(null);
    setSuccessMessage(null);
    setHasAttemptedSubmit(true);
    
    switch (currentStep) {
      case 'personal':
        if (validatePersonalStep(true)) {
          setCurrentStep('academic');
        }
        break;
      case 'academic':
        if (validateAcademicStep(true)) {
          setCurrentStep('password');
        }
        break;
      case 'password':
        if (validatePasswordStep(true)) {
          setCurrentStep('parent-id');
        }
        break;
      case 'parent-id':
        if (validateParentIdStep(true)) {
          await handleRegistrationSubmit();
        }
        break;
    }
  };

  const handlePreviousStep = () => {
    setError(null);
    setSuccessMessage(null);
    
    switch (currentStep) {
      case 'academic':
        setCurrentStep('personal');
        break;
      case 'password':
        setCurrentStep('academic');
        break;
      case 'parent-id':
        setCurrentStep('password');
        break;
      case 'otp':
        setCurrentStep('parent-id');
        break;
    }
  };
  
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep === 'otp') {
      // Handle OTP submission
      await handleOTPSubmit(e);
    } else {
      // Handle step navigation
      await handleNextStep();
    }
  };

  const handleRegistrationSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    if (!parentIdPicture) {
      setParentIdError('Parent ID picture is required');
      setLoading(false);
      return;
    }
    
    try {
      // First, upload the parent ID picture
      const formData = new FormData();
      formData.append('parentIdPicture', parentIdPicture);
      formData.append('email', email);
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
      formData.append('studentId', studentId);
      
      // Upload parent ID picture
      const uploadResponse = await fetch('/api/auth/register/upload-parent-id', {
        method: 'POST',
        body: formData,
      });
      
      const uploadData = await uploadResponse.json();
      
      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Failed to upload parent ID picture');
      }
      
      // Store the uploaded URL for use in OTP step
      setParentIdPictureUrl(uploadData.url);
      
      // Then proceed with registration validation
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          studentId,
          collegeDepartment,
          course,
          yearSection,
          parentIdPictureUrl: uploadData.url,
          step: 'validate'
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      if (data.step === 'otp') {
        setCurrentStep('otp');
        setSuccessMessage(data.message);
      }
      
    } catch (error: any) {
      setError(error.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          studentId,
          collegeDepartment,
          course,
          yearSection,
          otpCode,
          parentIdPictureUrl: parentIdPictureUrl, // Use the URL stored from validate step
          step: 'otp'
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }
      
      if (data.step === 'complete') {
        // Automatically sign in the user after successful registration
        setSuccessMessage('Registration successful! Logging you in...');
        
        // Use the login API for consistent session handling
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            step: 'credentials'
          }),
        });
        
        const loginData = await loginResponse.json();
        let userRole = 'student'; // Default to student for newly registered users
        
        if (!loginResponse.ok) {
          // If API login fails, try direct Supabase sign-in as fallback
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (signInError) {
            throw new Error(signInError.message || 'Failed to automatically log in after registration. Please try logging in manually.');
          }
          
          // Verify session was established
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('Session not established. Please try logging in manually.');
          }
          
          // Fetch user role from database
          const { data: userData, error: userRoleError } = await supabase
            .from('users')
            .select('role')
            .eq('id', signInData.user.id)
            .single();
          
          if (!userRoleError && userData && typeof userData === 'object' && 'role' in userData) {
            userRole = (userData as { role: string }).role || 'student';
          }
        } else if (loginData.role) {
          // Use role from login response
          userRole = loginData.role;
        }
        
        // Wait a moment to ensure session is established
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Handle redirect with accessToken preservation
        if (redirectTo !== '/') {
          // Preserve accessToken parameter if it exists
          const redirectUrl = new URL(redirectTo, window.location.origin);
          if (accessToken) {
            redirectUrl.searchParams.set('accessToken', accessToken);
          }
          router.push(redirectUrl.toString());
        } else if (accessToken) {
          // Legacy support for direct access token handling (without audit trail logging)
          const { data: linkData, error: linkError } = await supabase
            .from('form_access_links')
            .select('form_id, expires_at')
            .eq('access_token', accessToken)
            .gt('expires_at', new Date().toISOString())
            .single();
          
          if (linkError || !linkData) {
            throw new Error('Invalid or expired access token');
          }
          
          // Redirect to the form
          router.push(`/student/forms/${(linkData as any).form_id}?accessToken=${accessToken}`);
          return;
        }
        
        // Redirect based on user role (though new registrations should always be students)
        if (userRole === 'admin') {
          router.push('/admin');
        } else {
          router.push('/student');
        }
      }
      
    } catch (error: any) {
      setError(error.message || 'An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToForm = () => {
    setCurrentStep('parent-id');
    setError(null);
    setSuccessMessage(null);
    setOtpCode('');
  };

  const processParentIdFile = (file: File) => {
    setParentIdError(null);

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setParentIdError('Please upload a valid image file (PNG, JPEG, JPG, or WEBP)');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setParentIdError('File size must be less than 10MB');
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
    processParentIdFile(file);
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
      processParentIdFile(file);
    }
  };

  const handleRemoveParentIdPicture = () => {
    setParentIdPicture(null);
    setParentIdPicturePreview(null);
    setParentIdError(null);
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'validate',
          firstName,
          lastName,
          studentId,
          email,
          collegeDepartment,
          course,
          yearSection,
          password,
          parentIdPictureUrl: parentIdPictureUrl || '' // Include parent ID picture URL if available
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

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Auto-hide error message after 10 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Memoized validation results to prevent infinite re-renders
  const isPasswordStepValid = useMemo(() => {
    return validatePasswordStep(false);
  }, [password, confirmPassword]);

  const isPersonalStepValid = useMemo(() => {
    return validatePersonalStep(false);
  }, [firstName, lastName, studentId, email, emailError, studentIdError]);

  const isAcademicStepValid = useMemo(() => {
    // Only check validity, don't trigger error display
    return collegeDepartment && course && yearSection.trim() && validateYearSection(yearSection);
  }, [collegeDepartment, course, yearSection]);
  
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
              {currentStep === 'personal' && 'Personal Information'}
              {currentStep === 'academic' && 'Academic Information'}
              {currentStep === 'password' && 'Create Password'}
              {currentStep === 'parent-id' && 'Parent ID Picture'}
              {currentStep === 'otp' && 'Verify Your Email'}
            </h2>
            <p className="text-gray-600">
              {currentStep === 'personal' && 'Tell us about yourself'}
              {currentStep === 'academic' && 'Your academic details'}
              {currentStep === 'password' && 'Secure your account'}
              {currentStep === 'parent-id' && 'Upload your parent\'s ID picture with signature'}
              {currentStep === 'otp' && 'Enter the verification code sent to your email'}
            </p>
            {currentStep === 'personal' && (
            <p className="mt-4 text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/login" prefetch={false} className="font-semibold text-green-600 hover:text-green-500 transition-colors">
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
          
          <form className="space-y-6" onSubmit={handleFormSubmit}>
            {/* Step 1: Personal Information */}
            {currentStep === 'personal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first-name" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="first-name"
                    name="firstName"
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors placeholder-gray-400"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="last-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="last-name"
                    name="lastName"
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors placeholder-gray-400"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="student-id" className="block text-sm font-medium text-gray-700 mb-2">
                  Student ID <span className="text-red-500">*</span>
                </label>
                <input
                  id="student-id"
                  name="studentId"
                  type="text"
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors placeholder-gray-400 ${
                    studentIdError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your student ID"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />
                {studentIdError && (
                  <p className="mt-1 text-sm text-red-600">{studentIdError}</p>
                )}
              </div>

              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors placeholder-gray-400 ${
                    emailError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="your.email@plpasig.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {emailError && (
                  <p className="mt-1 text-sm text-red-600">{emailError}</p>
                )}
              </div>
              </div>
            )}

            {/* Step 2: Academic Information */}
            {currentStep === 'academic' && (
              <div className="space-y-4">
              <div>
                <label htmlFor="college-department" className="block text-sm font-medium text-gray-700 mb-2">
                  College Department <span className="text-red-500">*</span>
                </label>
                <select
                  id="college-department"
                  name="collegeDepartment"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  value={collegeDepartment}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                >
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept.code} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-2">
                  Course <span className="text-red-500">*</span>
                </label>
                <select
                  id="course"
                  name="course"
                  required
                  disabled={!collegeDepartment}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                >
                  <option value="">Select Course</option>
                  {collegeDepartment && getCoursesByDepartment(
                    DEPARTMENTS.find(d => d.name === collegeDepartment)?.code || ''
                  ).map((courseOption) => (
                    <option key={courseOption.code} value={courseOption.fullName}>
                      {courseOption.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="year-section" className="block text-sm font-medium text-gray-700 mb-2">
                  Year & Section <span className="text-red-500">*</span>
                </label>
                <input
                  id="year-section"
                  name="yearSection"
                  type="text"
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors placeholder-gray-400 ${
                    yearSectionError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., 3rd Year - A"
                  value={yearSection}
                  onChange={(e) => {
                    setYearSection(e.target.value);
                    // Only validate on change if there was a previous error on this field
                    if (yearSectionError) {
                      if (e.target.value.trim() && !validateYearSection(e.target.value)) {
                        setYearSectionError('Invalid Format (e.g., 4th Year - A)' );
                      } else {
                        setYearSectionError(null);
                      }
                    }
                  }}
                  onBlur={() => {
                    // Only validate on blur if the field has value
                    if (yearSection.trim()) {
                      if (!validateYearSection(yearSection)) {
                        setYearSectionError('Invalid Format (e.g., 4th Year - A)');
                      } else {
                        setYearSectionError(null);
                      }
                    }
                  }}
                />
                {yearSectionError && (
                  <p className="mt-1 text-sm text-red-600">{yearSectionError}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Format: (Year Level) - (Single Alphabet Character Section) 
                </p>
              </div>
              </div>
            )}

            {/* Step 3: Password */}
            {currentStep === 'password' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <PasswordInput
                    id="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    required
                    hasError={!!passwordError}
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <PasswordInput
                    id="confirm-password"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    required
                    hasError={!!passwordError}
                  />
                </div>
                {passwordError && (
                  <p className="text-sm text-red-600">{passwordError}</p>
                )}
                
                {/* Terms and Conditions Checkbox */}
                <div className="flex items-start pt-2">
                  <input
                    id="terms-checkbox"
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    required
                  />
                  <label htmlFor="terms-checkbox" className="ml-3 text-sm text-gray-700">
                    I have read and agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open('/auth/about#terms', '_blank');
                      }}
                      className="text-green-600 hover:text-green-700 underline font-medium"
                    >
                      Terms and Conditions
                    </button>
                    {' '}and{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open('/auth/about#privacy', '_blank');
                      }}
                      className="text-green-600 hover:text-green-700 underline font-medium"
                    >
                      Privacy Policy
                    </button>
                  </label>
                </div>
              </div>
            )}

            {/* Step 4: Parent ID Picture Upload */}
            {currentStep === 'parent-id' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="parent-id-picture" className="block text-sm font-medium text-gray-700 mb-2">
                    Parent ID Picture with Signature <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm text-gray-500 mb-4">
                    Please upload a clear picture of your parent's ID card with their signature visible. 
                    Accepted formats: PNG, JPEG, JPG, or WEBP (max 10MB)
                  </p>
                  
                  {!parentIdPicturePreview ? (
                    <div className="mt-2">
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
                          <Upload className="w-10 h-10 mb-3 text-gray-400" />
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
                  ) : (
                    <div className="relative">
                      <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <img
                              src={parentIdPicturePreview}
                              alt="Parent ID Preview"
                              className="h-32 w-32 object-cover rounded-lg"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {parentIdPicture?.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {(parentIdPicture?.size || 0) / 1024 / 1024} MB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveParentIdPicture}
                            className="flex-shrink-0 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => document.getElementById('parent-id-upload')?.click()}
                        className="mt-2 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Change Picture
                      </button>
                      <input
                        id="parent-id-upload"
                        type="file"
                        className="hidden"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleParentIdUpload}
                      />
                    </div>
                  )}
                  
                  {parentIdError && (
                    <p className="mt-2 text-sm text-red-600">{parentIdError}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: OTP Verification */}
            {currentStep === 'otp' && (
              <div className="space-y-6">
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

            {/* Navigation Buttons */}
            <div className="flex space-x-3">
              {currentStep !== 'personal' && (
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
              )}
              
              {currentStep === 'password' ? (
                <button
                  type="submit"
                  disabled={loading || !isPasswordStepValid || !agreeToTerms}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    !loading && isPasswordStepValid && agreeToTerms
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Next
                </button>
              ) : currentStep === 'parent-id' ? (
                <button
                  type="button"
                  onClick={handleRegistrationSubmit}
                  disabled={loading || !parentIdPicture}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    !loading && parentIdPicture
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating Account...</span>
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </button>
              ) : currentStep === 'otp' ? (
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
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Next
                </button>
              )}
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

export default function Register() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
} 