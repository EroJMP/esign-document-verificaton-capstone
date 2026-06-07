'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, FileText, Settings, LogOut, Menu, X, BarChart3 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: Home },
    { name: 'Forms', href: '/admin/forms', icon: FileText },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    // For the dashboard, only match exact path to avoid conflicts
    if (path === '/admin') {
      return pathname === path;
    }
    // For other paths, match if pathname starts with the path
    return pathname?.startsWith(`${path}/`) || pathname === path;
  };

  const handleSignOut = (e: React.MouseEvent) => {
    e.preventDefault();
    // Redirect to the dedicated sign out page
    window.location.href = '/auth/signout';
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 z-20 m-4">
        <button
          type="button"
          className="p-2 rounded-md text-green-800 hover:text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span className="sr-only">Open sidebar</span>
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Menu className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile menu backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-10 bg-green-800 bg-opacity-75 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full bg-green-800 text-white z-20
        transition-transform duration-300 ease-in-out transform
        lg:translate-x-0 lg:w-64
        ${isMobileMenuOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo and Title */}
          <div className="flex flex-col items-center pt-8 pb-6 bg-green-800">
            <img 
              src="/logo.png" 
              alt="School Logo" 
              className="h-30 w-30 object-contain mb-4"
            />
            <span className="text-2xl font-bold mb-2">Administration</span>
            <div className="w-full border-t border-green-700 mt-2"></div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6">
            {navigation.map((item, index) => (
              <div key={item.name}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center justify-start px-6 py-4 text-base font-medium rounded-lg transition-colors mb-2
                    ${isActive(item.href)
                      ? 'bg-green-700/50 text-white font-semibold'
                      : 'text-white hover:bg-green-700/30 hover:text-white'}
                  `}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="mr-4 h-6 w-6 flex-shrink-0" aria-hidden="true" />
                  <span className="flex-1">{item.name}</span>
                </Link>
                {/* Add divider after Reports */}
                {item.name === 'Reports' && (
                  <div className="w-full border-t border-green-700 my-4 mx-auto"></div>
                )}
              </div>
            ))}
          </nav>

          {/* Sign out button */}
          <div className="p-4 mt-auto">
            <button
              onClick={handleSignOut}
              className="flex items-center justify-start w-full px-6 py-4 text-base font-medium text-white rounded-lg hover:bg-green-700/30 transition-colors"
            >
              <LogOut className="mr-4 h-6 w-6 flex-shrink-0" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
} 