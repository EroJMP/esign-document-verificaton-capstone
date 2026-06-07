import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { sendOTPEmail } from '@/lib/email-service';

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    // Validate inputs
    if (!currentPassword) {
      return NextResponse.json({ 
        error: 'Current password is required' 
      }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ 
        error: 'Password must be at least 6 characters long' 
      }, { status: 400 });
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword
    });

    if (signInError) {
      return NextResponse.json({ 
        error: 'Current password is incorrect' 
      }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Get user details for email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ 
        error: 'Failed to fetch user details' 
      }, { status: 500 });
    }

    // Store OTP in database
    const { error: otpError } = await supabase
      .from('password_change_otps')
      .insert({
        user_id: user.id,
        otp_code: otpCode,
        email: user.email!,
        expires_at: expiresAt.toISOString(),
        is_used: false
      });

    if (otpError) {
      console.error('Error storing OTP:', otpError);
      return NextResponse.json({ 
        error: 'Failed to generate verification code' 
      }, { status: 500 });
    }

    // Send OTP email
    const userName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'User';
    const emailResult = await sendOTPEmail({
      email: user.email!,
      otpCode,
      userName
    });

    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      return NextResponse.json({ 
        error: 'Failed to send verification email' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Verification code sent to your email',
      expiresAt: expiresAt.toISOString()
    });

  } catch (error: any) {
    console.error('OTP generation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
