import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { otpCode, newPassword } = body;

    // Validate inputs
    if (!otpCode || otpCode.length !== 6) {
      return NextResponse.json({ 
        error: 'Please enter a valid 6-digit verification code' 
      }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ 
        error: 'Password must be at least 6 characters long' 
      }, { status: 400 });
    }

    // Find valid OTP for this user
    const { data: otpData, error: otpError } = await supabase
      .from('password_change_otps')
      .select('*')
      .eq('user_id', user.id)
      .eq('otp_code', otpCode)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpData) {
      return NextResponse.json({ 
        error: 'Invalid or expired verification code' 
      }, { status: 400 });
    }

    // Mark OTP as used
    const { error: markUsedError } = await supabase
      .from('password_change_otps')
      .update({ is_used: true })
      .eq('id', otpData.id);

    if (markUsedError) {
      console.error('Error marking OTP as used:', markUsedError);
    }

    // Update password using Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    // Clean up expired OTPs for this user
    await supabase
      .from('password_change_otps')
      .delete()
      .eq('user_id', user.id)
      .lt('expires_at', new Date().toISOString());

    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully' 
    });

  } catch (error: any) {
    console.error('OTP verification API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
