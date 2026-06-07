import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { generatePasswordResetOTP, verifyPasswordResetOTP, markPasswordResetOTPAsUsed } from '@/lib/otp-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { step, email, otpCode, newPassword } = body;

    const supabase = await createClient();

    switch (step) {
      case 'request': {
        // Step 1: Generate and send password reset OTP
        if (!email) {
          return NextResponse.json(
            { error: 'Email is required' },
            { status: 400 }
          );
        }

        // Check if email exists in the database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('email', email)
          .single();

        if (userError || !userData) {
          return NextResponse.json(
            { error: 'No account found with this email address' },
            { status: 404 }
          );
        }

        // Generate password reset OTP
        const otpResult = await generatePasswordResetOTP(
          email,
          userData.first_name,
          userData.last_name
        );

        if (!otpResult.success) {
          return NextResponse.json(
            { error: otpResult.error || 'Failed to generate reset code' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Password reset code sent to your email',
          step: 'otp'
        });
      }

      case 'verify': {
        // Step 2: Verify the OTP code
        if (!email || !otpCode) {
          return NextResponse.json(
            { error: 'Email and OTP code are required' },
            { status: 400 }
          );
        }

        const verifyResult = await verifyPasswordResetOTP(email, otpCode);

        if (!verifyResult.success) {
          return NextResponse.json(
            { error: verifyResult.error || 'Invalid or expired reset code' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Reset code verified successfully',
          step: 'password'
        });
      }

      case 'update': {
        // Step 3: Update the password
        if (!email || !otpCode || !newPassword) {
          return NextResponse.json(
            { error: 'Email, OTP code, and new password are required' },
            { status: 400 }
          );
        }

        // Verify OTP again before password update
        const verifyResult = await verifyPasswordResetOTP(email, otpCode);

        if (!verifyResult.success) {
          return NextResponse.json(
            { error: verifyResult.error || 'Invalid or expired reset code' },
            { status: 400 }
          );
        }

        // Validate password strength
        const hasUpperCase = /[A-Z]/.test(newPassword);
        const hasLowerCase = /[a-z]/.test(newPassword);
        const hasNumbers = /\d/.test(newPassword);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>-_=+]/.test(newPassword);
        const hasMinLength = newPassword.length >= 8;

        if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
          return NextResponse.json(
            { error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character' },
            { status: 400 }
          );
        }

        // Get user ID from email
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single();

        if (userError || !userData) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }

        // Use service client for admin operations
        const serviceSupabase = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Update password in Supabase Auth using service client
        const { error: updateError } = await serviceSupabase.auth.admin.updateUserById(
          userData.id,
          { password: newPassword }
        );

        if (updateError) {
          return NextResponse.json(
            { error: 'Failed to update password' },
            { status: 500 }
          );
        }

        // Mark OTP as used after successful password update
        const markUsedResult = await markPasswordResetOTPAsUsed(email, otpCode);
        if (!markUsedResult.success) {
          // Don't fail the request, just log the error silently
        }

        return NextResponse.json({
          success: true,
          message: 'Password updated successfully'
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid step' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
