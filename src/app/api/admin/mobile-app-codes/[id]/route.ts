import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DELETE - Deactivate/delete a mobile app code
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Deactivate the code (soft delete)
    const { error: updateError } = await supabase
      .from('admin_mobile_app_login')
      .update({ is_active: false })
      .eq('id', id);

    if (updateError) {
      console.error('Error deactivating code:', updateError);
      return NextResponse.json(
        { error: 'Failed to deactivate code' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/mobile-app-codes/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update code (e.g., reactivate or extend expiration)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await req.json();
    const { is_active, daysToExtend } = body;

    const updates: any = {};

    if (typeof is_active === 'boolean') {
      updates.is_active = is_active;
    }

    if (daysToExtend && daysToExtend > 0) {
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + daysToExtend);
      updates.expires_at = newExpiresAt.toISOString();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    const { data: updatedCode, error: updateError } = await supabase
      .from('admin_mobile_app_login')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating code:', updateError);
      return NextResponse.json(
        { error: 'Failed to update code' },
        { status: 500 }
      );
    }

    return NextResponse.json({ code: updatedCode });
  } catch (error) {
    console.error('Error in PATCH /api/admin/mobile-app-codes/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

