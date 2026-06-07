import { createClient } from '@/lib/supabase/server';
import { sendRegistrationOTPEmail, sendLoginOTPEmail, sendPasswordResetOTPEmail } from '@/lib/email-service';

export interface OTPGenerationResult {
  success: boolean;
  message?: string;
  error?: string;
  expiresAt?: string;
}

export interface OTPVerificationResult {
  success: boolean;
  message?: string;
  error?: string;
}

export type OTPType = 'registration' | 'login';

/**
 * Generate a 6-digit OTP for email verification
 */
export function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate and send OTP for registration
 */
export async function generateRegistrationOTP(email: string, firstName: string, lastName: string): Promise<OTPGenerationResult> {
  try {
    const supabase = await createClient();
    
    // Check rate limiting
    const { data: rateLimitCheck } = await supabase.rpc('check_otp_rate_limit', {
      email_param: email
    });
    
    if (!rateLimitCheck) {
      return {
        success: false,
        error: 'Too many verification attempts. Please wait 5 minutes before trying again.'
      };
    }
    
    // Generate OTP
    const otpCode = generateOTPCode();
    
    // Set expiration time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    
    // Store OTP in database
    const { error: otpError } = await supabase
      .from('verification_otps')
      .insert({
        email,
        otp_code: otpCode,
        otp_type: 'registration',
        expires_at: expiresAt.toISOString(),
        is_used: false,
        attempts: 0
      });
    
    if (otpError) {
      console.error('Error storing registration OTP:', otpError);
      return {
        success: false,
        error: 'Failed to generate verification code'
      };
    }
    
    // Send OTP email
    const userName = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
    const emailResult = await sendRegistrationOTPEmail({
      email,
      otpCode,
      userName
    });
    
    if (!emailResult.success) {
      console.error('Failed to send registration OTP email:', emailResult.error);
      return {
        success: false,
        error: 'Failed to send verification email'
      };
    }
    
    return {
      success: true,
      message: 'Verification code sent to your email',
      expiresAt: expiresAt.toISOString()
    };
    
  } catch (error: any) {
    console.error('Registration OTP generation error:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}

/**
 * Generate and send OTP for login
 */
export async function generateLoginOTP(email: string, firstName: string, lastName: string): Promise<OTPGenerationResult> {
  try {
    const supabase = await createClient();
    
    // Check rate limiting
    const { data: rateLimitCheck } = await supabase.rpc('check_otp_rate_limit', {
      email_param: email
    });
    
    if (!rateLimitCheck) {
      return {
        success: false,
        error: 'Too many verification attempts. Please wait 5 minutes before trying again.'
      };
    }
    
    // Generate OTP
    const otpCode = generateOTPCode();
    
    // Set expiration time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    
    // Store OTP in database
    const { error: otpError } = await supabase
      .from('verification_otps')
      .insert({
        email,
        otp_code: otpCode,
        otp_type: 'login',
        expires_at: expiresAt.toISOString(),
        is_used: false,
        attempts: 0
      });
    
    if (otpError) {
      console.error('Error storing login OTP:', otpError);
      return {
        success: false,
        error: 'Failed to generate verification code'
      };
    }
    
    // Send OTP email
    const userName = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
    const emailResult = await sendLoginOTPEmail({
      email,
      otpCode,
      userName
    });
    
    if (!emailResult.success) {
      console.error('Failed to send login OTP email:', emailResult.error);
      return {
        success: false,
        error: 'Failed to send verification email'
      };
    }
    
    return {
      success: true,
      message: 'Verification code sent to your email',
      expiresAt: expiresAt.toISOString()
    };
    
  } catch (error: any) {
    console.error('Login OTP generation error:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}

/**
 * Verify OTP for registration
 */
export async function verifyRegistrationOTP(email: string, otpCode: string): Promise<OTPVerificationResult> {
  try {
    const supabase = await createClient();
    
    // Find valid OTP for this email
    const { data: otpData, error: otpError } = await supabase
      .from('verification_otps')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otpCode)
      .eq('otp_type', 'registration')
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (otpError || !otpData) {
      // Increment attempts for failed verification
      await supabase
        .from('verification_otps')
        .update({ attempts: otpData?.attempts ? otpData.attempts + 1 : 1 })
        .eq('email', email)
        .eq('otp_type', 'registration')
        .order('created_at', { ascending: false })
        .limit(1);
      
      return {
        success: false,
        error: 'Invalid or expired verification code'
      };
    }
    
    // Mark OTP as used
    const { error: markUsedError } = await supabase
      .from('verification_otps')
      .update({ is_used: true })
      .eq('id', otpData.id);
    
    if (markUsedError) {
      console.error('Error marking OTP as used:', markUsedError);
    }
    
    // Clean up expired OTPs for this email
    await supabase
      .from('verification_otps')
      .delete()
      .eq('email', email)
      .lt('expires_at', new Date().toISOString());
    
    return {
      success: true,
      message: 'Email verified successfully'
    };
    
  } catch (error: any) {
    console.error('Registration OTP verification error:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}

/**
 * Verify OTP for login
 */
export async function verifyLoginOTP(email: string, otpCode: string): Promise<OTPVerificationResult> {
  try {
    const supabase = await createClient();
    
    // Find valid OTP for this email
    const { data: otpData, error: otpError } = await supabase
      .from('verification_otps')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otpCode)
      .eq('otp_type', 'login')
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (otpError || !otpData) {
      // Increment attempts for failed verification
      await supabase
        .from('verification_otps')
        .update({ attempts: otpData?.attempts ? otpData.attempts + 1 : 1 })
        .eq('email', email)
        .eq('otp_type', 'login')
        .order('created_at', { ascending: false })
        .limit(1);
      
      return {
        success: false,
        error: 'Invalid or expired verification code'
      };
    }
    
    // Mark OTP as used
    const { error: markUsedError } = await supabase
      .from('verification_otps')
      .update({ is_used: true })
      .eq('id', otpData.id);
    
    if (markUsedError) {
      console.error('Error marking OTP as used:', markUsedError);
    }
    
    // Clean up expired OTPs for this email
    await supabase
      .from('verification_otps')
      .delete()
      .eq('email', email)
      .lt('expires_at', new Date().toISOString());
    
    return {
      success: true,
      message: 'Email verified successfully'
    };
    
  } catch (error: any) {
    console.error('Login OTP verification error:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}

// Password Reset OTP Functions
export async function generatePasswordResetOTP(email: string, firstName: string, lastName: string): Promise<OTPGenerationResult> {
  try {
    const supabase = await createClient();
    
    // Check rate limiting
    const { data: recentOTPs } = await supabase
      .from('verification_otps')
      .select('created_at')
      .eq('email', email)
      .eq('otp_type', 'password_reset')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order('created_at', { ascending: false })
      .limit(3);

    if (recentOTPs && recentOTPs.length >= 3) {
      return {
        success: false,
        error: 'Too many password reset attempts. Please wait 5 minutes before trying again.'
      };
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Store OTP in database
    const { error: insertError } = await supabase
      .from('verification_otps')
      .insert({
        email,
        otp_code: otpCode,
        otp_type: 'password_reset',
        expires_at: expiresAt.toISOString(),
        is_used: false,
        attempts: 0
      });

    if (insertError) {
      console.error('Error storing password reset OTP:', insertError);
      return {
        success: false,
        error: 'Failed to generate reset code'
      };
    }

    // Send email
    const emailResult = await sendPasswordResetOTPEmail({
      email,
      otpCode,
      userName: `${firstName} ${lastName}`
    });

    if (!emailResult.success) {
      return {
        success: false,
        error: 'Failed to send reset code email'
      };
    }

    return {
      success: true,
      message: 'Password reset code sent successfully'
    };
    
  } catch (error: any) {
    console.error('Password reset OTP generation error:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}

export async function verifyPasswordResetOTP(email: string, otpCode: string): Promise<OTPVerificationResult> {
  try {
    const supabase = await createClient();
    
    // Find the OTP record
    const { data: otpRecord, error: fetchError } = await supabase
      .from('verification_otps')
      .select('*')
      .eq('email', email)
      .eq('otp_type', 'password_reset')
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      return {
        success: false,
        error: 'Invalid or expired reset code'
      };
    }

    // Check if OTP has expired
    if (new Date() > new Date(otpRecord.expires_at)) {
      return {
        success: false,
        error: 'Reset code has expired'
      };
    }

    // Check if max attempts exceeded (using hardcoded limit of 3)
    if (otpRecord.attempts >= 3) {
      return {
        success: false,
        error: 'Too many failed attempts. Please request a new reset code.'
      };
    }

    // Verify OTP code
    if (otpRecord.otp_code !== otpCode) {
      // Increment attempts
      await supabase
        .from('verification_otps')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id);

      return {
        success: false,
        error: 'Invalid reset code'
      };
    }

    // Don't mark as used yet - only verify the code
    // It will be marked as used when the password is actually updated

    return {
      success: true,
      message: 'Reset code verified successfully'
    };
    
  } catch (error: any) {
    console.error('Password reset OTP verification error:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}

export async function markPasswordResetOTPAsUsed(email: string, otpCode: string): Promise<OTPVerificationResult> {
  try {
    const supabase = await createClient();
    
    // Find the OTP record
    const { data: otpRecord, error: fetchError } = await supabase
      .from('verification_otps')
      .select('*')
      .eq('email', email)
      .eq('otp_type', 'password_reset')
      .eq('otp_code', otpCode)
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      return {
        success: false,
        error: 'Invalid or expired reset code'
      };
    }

    // Mark OTP as used
    await supabase
      .from('verification_otps')
      .update({ is_used: true })
      .eq('id', otpRecord.id);

    return {
      success: true,
      message: 'OTP marked as used successfully'
    };
    
  } catch (error: any) {
    console.error('Error marking password reset OTP as used:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}

