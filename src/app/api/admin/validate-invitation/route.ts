import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Find valid invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('admin_invitations')
      .select('email, expires_at, is_used')
      .eq('invitation_token', token)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (invitationError) {
      return NextResponse.json({ 
        error: 'Invalid or expired invitation token' 
      }, { status: 400 });
    }

    if (!invitation) {
      return NextResponse.json({ 
        error: 'Invalid or expired invitation token' 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      email: invitation.email 
    });

  } catch (error: any) {
    console.error('Invitation validation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
