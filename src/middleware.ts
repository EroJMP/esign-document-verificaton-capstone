import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Simple in-memory store for rate limiting
// In production, use Redis or another external store
const rateLimit = {
  windowMs: 60 * 1000, // 1 minute
  max: 200, // Increased limit to reduce false positives
  store: new Map<string, { count: number; resetTime: number }>()
};

// Clean up the store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimit.store.entries()) {
    if (now > value.resetTime) {
      rateLimit.store.delete(key);
    }
  }
}, rateLimit.windowMs);

export async function middleware(req: NextRequest) {
  // Apply rate limiting to API routes only
  if (req.nextUrl.pathname.startsWith('/api/')) {
    // Get IP address from headers or use a fallback
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
    const now = Date.now();
    
    // Initialize or get the rate limit data for this IP
    if (!rateLimit.store.has(ip)) {
      rateLimit.store.set(ip, {
        count: 0,
        resetTime: now + rateLimit.windowMs
      });
    }
    
    const rateLimitData = rateLimit.store.get(ip)!;
    
    // Reset count if the window has passed
    if (now > rateLimitData.resetTime) {
      rateLimitData.count = 0;
      rateLimitData.resetTime = now + rateLimit.windowMs;
    }
    
    // Increment the count
    rateLimitData.count++;
    
    // Check if the rate limit is exceeded
    if (rateLimitData.count > rateLimit.max) {
      return NextResponse.json(
        { error: 'Request rate limit reached. Please try again later.' },
        { status: 429 }
      );
    }
  }

  // Handle Supabase session management
  const { supabaseResponse, user, supabase } = await updateSession(req);
  
  const url = new URL(req.url);
  const pathname = req.nextUrl.pathname;
  
  // Check if this is the login page with signedOut=true
  const isLoginAfterSignOut = pathname === '/auth/login' && url.searchParams.get('signedOut') === 'true';
  
  // If it's a sign out page, handle it in the page component
  if (pathname === '/auth/signout') {
    return supabaseResponse;
  }
  
  // Check if the path is for protected routes
  // Exclude admin registration page from protection
  if ((pathname.startsWith('/admin') && pathname !== '/admin/register') || pathname.startsWith('/student')) {
    // If no user, redirect to login
    if (!user) {
      const redirectUrl = new URL('/auth/login', req.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }
    
    // For admin routes, check if user is admin
    if (pathname.startsWith('/admin') && pathname !== '/admin/register') {
      try {
        const { data: userData, error: roleError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (roleError) {
          console.error('Error checking user role in middleware:', roleError);
          // If error is "no rows returned", user doesn't exist in users table - deny access
          if (roleError.code === 'PGRST116') {
            return NextResponse.redirect(new URL('/unauthorized', req.url));
          }
          // For other errors, log and allow through - client-side check will handle it
          // This prevents blocking legitimate admins due to transient DB issues
          console.warn('Allowing request through due to role check error, client-side will verify');
          return supabaseResponse;
        }
        
        // Check if user is admin
        const userRole = userData?.role;
        const isAdmin = userRole === 'admin';
        
        if (!isAdmin) {
          // Redirect non-admin users to unauthorized page
          const redirectResponse = NextResponse.redirect(new URL('/unauthorized', req.url));
          // Preserve cookies from supabaseResponse
          supabaseResponse.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value, { 
              ...cookie, 
              sameSite: 'lax',
              httpOnly: cookie.httpOnly 
            });
          });
          return redirectResponse;
        }
      } catch (error) {
        console.error('Exception checking user role in middleware:', error);
        // On exception, allow through - client-side check will handle it
        // This prevents blocking admins due to unexpected errors
        return supabaseResponse;
      }
    }
  }
  
  // For login/register pages, redirect to dashboard if already logged in
  if ((pathname === '/auth/login' || pathname === '/auth/register' || pathname === '/auth/admin-register') && user) {
    // Don't redirect if this is the login page after sign out
    if (isLoginAfterSignOut) {
      return supabaseResponse;
    }
    
    // We'll handle role-based redirects in the login API route to avoid extra DB calls here
    return NextResponse.redirect(new URL('/student', req.url)); // Default redirect, will be corrected by login handler
  }
  
  return supabaseResponse;
}

// Only run middleware on specific paths
export const config = {
  matcher: [
    '/',
    '/admin/:path*',
    '/student/:path*',
    '/auth/login',
    '/auth/register',
    '/auth/admin-register',
    '/auth/callback',
    '/auth/signout',
    '/api/:path*',
  ],
}; 