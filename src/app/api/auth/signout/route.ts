import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Sign out on the server
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Sign out error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    // Create response
    const response = NextResponse.json({ success: true });
    
    // The new SSR client handles cookie cleanup automatically
    // but we can also manually clear auth cookies if needed
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');
    
    return response;
  } catch (error: any) {
    console.error('Sign out error:', error);
    return NextResponse.json({ error: 'Sign out failed' }, { status: 500 });
  }
}