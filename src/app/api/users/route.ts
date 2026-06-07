import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  try {
    // Check if user is admin
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const department = searchParams.get('department');
    const course = searchParams.get('course');
    const section = searchParams.get('section');

    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by role if specified
    if (role) {
      query = query.eq('role', role);
    }

    // Apply search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,student_id.ilike.%${search}%`);
    }

    // Apply department filter
    if (department) {
      query = query.eq('college_department', department);
    }

    // Apply course filter
    if (course) {
      query = query.eq('course', course);
    }

    // Apply section filter
    if (section) {
      query = query.eq('year_section', section);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({ users: data });
  } catch (error: any) {
    console.error('Users API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
