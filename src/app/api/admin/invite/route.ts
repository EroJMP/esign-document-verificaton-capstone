import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { sendAdminInvitation } from '@/lib/email-service';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    // Check if user is admin
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error || !isAdmin || !user) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const body = await req.json();
    const { email } = body;

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json({ 
        error: 'Valid email address is required' 
      }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json({ 
        error: 'User with this email already exists' 
      }, { status: 400 });
    }

    // Check if there's already a pending invitation
    const { data: existingInvitation, error: invitationCheckError } = await supabase
      .from('admin_invitations')
      .select('id, expires_at, is_used')
      .eq('email', email.toLowerCase())
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvitation) {
      return NextResponse.json({ 
        error: 'An invitation has already been sent to this email address' 
      }, { status: 400 });
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    
    // Set expiration time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Store invitation in database
    const { error: invitationError } = await supabase
      .from('admin_invitations')
      .insert({
        email: email.toLowerCase(),
        invitation_token: invitationToken,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
        is_used: false
      });

    if (invitationError) {
      console.error('Error storing invitation:', invitationError);
      return NextResponse.json({ 
        error: 'Failed to create invitation' 
      }, { status: 500 });
    }

    // Get inviter's name for email
    const { data: inviterData, error: inviterError } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    if (inviterError || !inviterData) {
      console.error('Error fetching inviter data:', inviterError);
      return NextResponse.json({ 
        error: 'Failed to fetch inviter information' 
      }, { status: 500 });
    }

    // Create invitation link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                   'http://localhost:3000';
    console.log('🔍 Environment Debug:', {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      baseUrl: baseUrl
    });
    const invitationLink = `${baseUrl}/auth/admin-register?token=${invitationToken}`;

    // Send invitation email
    const invitedByName = `${inviterData.first_name || ''} ${inviterData.last_name || ''}`.trim() || 'System Administrator';
    const emailResult = await sendAdminInvitation({
      email: email.toLowerCase(),
      invitationLink,
      invitedByName
    });

    if (!emailResult.success) {
      console.error('Failed to send invitation email:', emailResult.error);
      return NextResponse.json({ 
        error: 'Failed to send invitation email' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Admin invitation sent successfully',
      expiresAt: expiresAt.toISOString()
    });

  } catch (error: any) {
    console.error('Admin invitation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
