'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { HelpCircle, Settings, LogOut, ChevronDown, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Override body background to remove any inherited background images
  useEffect(() => {
    // Save original body styles
    const originalBodyBackground = document.body.style.background;
    const originalBodyBackgroundImage = document.body.style.backgroundImage;
    const originalBodyBackgroundAttachment = document.body.style.backgroundAttachment;
    const originalBodyBackgroundRepeat = document.body.style.backgroundRepeat;
    const originalBodyBackgroundPosition = document.body.style.backgroundPosition;
    const originalBodyBackgroundSize = document.body.style.backgroundSize;
    
    // Apply clean background with all properties
    document.body.style.background = '#f3f4f6';
    document.body.style.backgroundImage = 'none';
    document.body.style.backgroundAttachment = 'initial';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundPosition = 'initial';
    document.body.style.backgroundSize = 'initial';
    
    // Also apply to html element
    document.documentElement.style.background = '#f3f4f6';
    document.documentElement.style.backgroundImage = 'none';
    
    // Cleanup on unmount
    return () => {
      document.body.style.background = originalBodyBackground;
      document.body.style.backgroundImage = originalBodyBackgroundImage;
      document.body.style.backgroundAttachment = originalBodyBackgroundAttachment;
      document.body.style.backgroundRepeat = originalBodyBackgroundRepeat;
      document.body.style.backgroundPosition = originalBodyBackgroundPosition;
      document.body.style.backgroundSize = originalBodyBackgroundSize;
      document.documentElement.style.background = '';
      document.documentElement.style.backgroundImage = '';
    };
  }, []);

  // Fetch current user data via API route
  useEffect(() => {
    let isMounted = true;
    
    async function fetchUserData() {
      try {
        const response = await fetch('/api/student/profile');
        
        if (!isMounted) return;
        
        if (!response.ok) {
          console.error('Failed to fetch user profile:', response.status);
          setCurrentUser(null);
          setLoading(false);
          return;
        }
        
        const userData = await response.json();
        
        setCurrentUser(userData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user data:', err);
        if (isMounted) {
          setCurrentUser(null);
          setLoading(false);
        }
      }
    }
    
    fetchUserData();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Handle clicks outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login?signedOut=true');
  };
  
  // Get display name
  const getDisplayName = () => {
    if (currentUser?.first_name && currentUser?.last_name) {
      return `${currentUser.first_name} ${currentUser.last_name}`;
    }
    
    if (currentUser?.user_metadata?.name) {
      return currentUser.user_metadata.name;
    }
    
    return currentUser?.email || 'Student';
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (currentUser?.first_name && currentUser?.last_name) {
      return `${currentUser.first_name.charAt(0)}${currentUser.last_name.charAt(0)}`.toUpperCase();
    }
    
    if (currentUser?.user_metadata?.name) {
      const names = currentUser.user_metadata.name.split(' ');
      if (names.length >= 2) {
        return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
      }
      return names[0].charAt(0).toUpperCase();
    }
    
    if (currentUser?.email) {
      return currentUser.email.charAt(0).toUpperCase();
    }
    
    return 'S';
  };
  
  return (
    <div className="min-h-screen bg-gray-100 student-portal-layout" style={{ 
      backgroundImage: 'none',
      background: '#f3f4f6',
      backgroundAttachment: 'initial',
      backgroundRepeat: 'no-repeat'
    }}>
      {/* Header */}
      <header className="bg-green-700 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16 items-center">
            <div className="flex items-center min-w-0 flex-1">
              <Link href="/student" className="flex items-center group flex-shrink-0">
                <img 
                  src="/logo.png" 
                  alt="School Logo" 
                  className="h-7 w-7 sm:h-10 sm:w-10 object-contain mr-2 sm:mr-3 transition-transform group-hover:scale-105"
                />
                <h1 className="text-sm sm:text-xl font-semibold text-white group-hover:text-green-100 transition-colors whitespace-nowrap">Student Portal</h1>
              </Link>
              {loading ? (
                <div className="ml-2 sm:ml-4 h-4 sm:h-5 w-16 sm:w-24 bg-green-600 animate-pulse rounded"></div>
              ) : (
                <p className="ml-2 sm:ml-4 text-xs sm:text-sm text-white truncate">Welcome back, {getDisplayName()}</p>
              )}
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <Link 
                href="/student/faq"
                className="p-1 rounded-full text-white hover:text-green-200 transition-colors"
                aria-label="Frequently Asked Questions"
                title="Frequently Asked Questions"
              >
                <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              </Link>
              
              {/* User Avatar Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-1 sm:space-x-2 p-1 rounded-full text-white hover:text-green-200 focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium">
                    {loading ? '...' : getUserInitials()}
                  </div>
                  <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-green-500 ring-opacity-20 z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b border-green-100">
                        <div className="font-medium truncate" title={loading ? 'Loading...' : getDisplayName()}>
                          {loading ? 'Loading...' : getDisplayName()}
                        </div>
                        <div className="text-gray-500 text-xs truncate" title={currentUser?.email || ''}>
                          {currentUser?.email || 'No email'}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          router.push('/student/settings');
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition-colors"
                      >
                        <Settings className="mr-3 h-4 w-4 text-green-600 flex-shrink-0" />
                        Settings
                      </button>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          router.push('/student/about');
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition-colors"
                      >
                        <Info className="mr-3 h-4 w-4 text-green-600 flex-shrink-0" />
                        About App
                      </button>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          handleSignOut();
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition-colors"
                      >
                        <LogOut className="mr-3 h-4 w-4 text-green-600 flex-shrink-0" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
} 