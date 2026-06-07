import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const requestUrl = new URL(req.url);
    const code = requestUrl.searchParams.get('code');
    
    if (!code) {
      return NextResponse.redirect(new URL('/auth/login?error=no_code', requestUrl.origin));
    }
    
    const supabase = await createClient();
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(new URL('/auth/login?error=callback_error', requestUrl.origin));
    }
    
    if (data.session) {
      // Get the user's role to determine where to redirect
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.session.user.id)
        .single();
      
      if (userData) {
        // Redirect based on user role
        if (userData.role === 'admin') {
          return NextResponse.redirect(new URL('/admin', requestUrl.origin));
        } else {
          return NextResponse.redirect(new URL('/student', requestUrl.origin));
        }
      }
    }
    
    // Fallback to login page if something went wrong
    return NextResponse.redirect(new URL('/auth/login', requestUrl.origin));
  } catch (error: any) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/auth/login?error=callback_error', req.url));
  }
}