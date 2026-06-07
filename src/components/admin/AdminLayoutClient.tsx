'use client';

import { useEffect } from 'react';
import AdminSidebar from '@/components/layout/AdminSidebar';

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
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
    document.body.style.background = '#f9fafb';
    document.body.style.backgroundImage = 'none';
    document.body.style.backgroundAttachment = 'initial';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundPosition = 'initial';
    document.body.style.backgroundSize = 'initial';
    
    // Also apply to html element
    document.documentElement.style.background = '#f9fafb';
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

  return (
    <div className="flex h-screen bg-gray-50 admin-portal-layout" style={{ 
      backgroundImage: 'none',
      background: '#f9fafb',
      backgroundAttachment: 'initial',
      backgroundRepeat: 'no-repeat'
    }}>
      <AdminSidebar />
      <div className="flex-1 overflow-auto lg:ml-64">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

