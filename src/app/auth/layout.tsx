'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/auth/login';
  const isAboutPage = pathname === '/auth/about';

  return (
    <div className="min-h-screen">
      {/* Transparent Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-16">
            {/* Navigation Links - Centered */}
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/login"
                className={`text-sm font-medium transition-colors ${
                  isLoginPage
                    ? 'text-green-600'
                    : 'text-white hover:text-green-400'
                }`}
              >
                Sign In
              </Link>
              <span className="text-white">|</span>
              <Link
                href="/auth/about"
                className={`text-sm font-medium transition-colors ${
                  isAboutPage
                    ? 'text-green-600'
                    : 'text-white hover:text-green-400'
                }`}
              >
                About Us
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main>{children}</main>
    </div>
  );
}

