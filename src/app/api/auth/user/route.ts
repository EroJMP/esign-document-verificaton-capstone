import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth-helpers';

// GET /api/auth/user - Get current authenticated user with role
export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return createUnauthorizedResponse();
    }
    
    const userId = user.id;
    
    // Get user role from database
    const { data: userData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    // Return user with role
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: userData?.role || null
      },
      session: {
        access_token: 'authenticated', // Indicate session exists
        expires_at: null,
        expires_in: null,
        refresh_token: '',
        token_type: 'bearer'
      }
    });
    
  } catch (error: any) {
    console.error('Error in GET /api/auth/user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

