import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse } from '@/lib/auth-helpers';

// GET /api/admin/profile - Get current admin profile data
export async function GET(req: NextRequest) {
  try {
    // Get authenticated admin
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error || !user || !isAdmin) {
      return createUnauthorizedResponse();
    }
    
    const userId = user.id;
    
    // Get admin profile data from database
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('Error fetching admin profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch admin profile' }, { status: 500 });
    }
    
    // Return admin data
    return NextResponse.json(userProfile);
    
  } catch (error: any) {
    console.error('Error in GET /api/admin/profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

