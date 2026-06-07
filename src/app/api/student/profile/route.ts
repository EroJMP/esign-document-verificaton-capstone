import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth-helpers';

// GET /api/student/profile - Get current student profile data
export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return createUnauthorizedResponse();
    }
    
    const userId = user.id;
    
    // Get user profile data from database
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('first_name, last_name, email, parent_id_picture_url')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }
    
    // Return user data
    return NextResponse.json({
      id: user.id,
      ...userProfile
    });
    
  } catch (error: any) {
    console.error('Error in GET /api/student/profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

