import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is admin
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error || !isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { guardian_email, year_section } = body;

    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (guardian_email !== undefined) {
      updateData.guardian_email = guardian_email;
    }

    if (year_section !== undefined) {
      updateData.year_section = year_section;
    }

    // Update user profile with only the provided fields
    const { data, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (error: any) {
    console.error('User partial update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
