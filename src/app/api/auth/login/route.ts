import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { verifyLoginOTP, generateLoginOTP } from '@/lib/otp-service';

export async function POST(req: NextRequest) {
  try {
    const { email, password, otpCode, step } = await req.json();
    
    // Add some basic validation to prevent unnecessary API calls
    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required' 
      }, { status: 400 });
    }

    // Step 1: Verify credentials and generate OTP
    if (step === 'credentials') {
      // Create server client
      const supabase = await createClient();
      
      // Single sign-in attempt - no retry logic to prevent rate limiting
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) {
        // Handle specific error cases without retrying
        if (signInError.message.includes('Email not confirmed')) {
          return NextResponse.json({ 
            error: 'Please check your email and click the confirmation link before signing in.' 
          }, { status: 400 });
        }
        
        if (signInError.message.includes('Invalid login credentials')) {
          return NextResponse.json({ 
            error: 'Invalid email or password. Please check your credentials and try again.' 
          }, { status: 400 });
        }
        
        return NextResponse.json({ 
          error: signInError.message 
        }, { status: 400 });
      }
      
      if (!signInData.user) {
        return NextResponse.json({ 
          error: 'Authentication failed' 
        }, { status: 400 });
      }
      
      // Get user role and details
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, first_name, last_name')
        .eq('id', signInData.user.id)
        .single();
      
      if (userError) {
        console.error('Error fetching user role:', userError);
        // Default to student role if there's an error
        const firstName = signInData.user.user_metadata?.first_name || 'User';
        const lastName = signInData.user.user_metadata?.last_name || '';
        
        // Generate and send OTP
        const otpResult = await generateLoginOTP(email, firstName, lastName);
        
        if (!otpResult.success) {
          return NextResponse.json({ 
            error: otpResult.error || 'Failed to send verification code'
          }, { status: 500 });
        }
        
        return NextResponse.json({ 
          success: true, 
          step: 'otp',
          message: 'Verification code sent to your email',
          userId: signInData.user.id,
          role: 'student'
        });
      }
      
      // Get user details for OTP email
      const firstName = userData.first_name || signInData.user.user_metadata?.first_name || 'User';
      const lastName = userData.last_name || signInData.user.user_metadata?.last_name || '';
      
      // Generate and send OTP
      const otpResult = await generateLoginOTP(email, firstName, lastName);
      
      if (!otpResult.success) {
        return NextResponse.json({ 
          error: otpResult.error || 'Failed to send verification code'
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        step: 'otp',
        message: 'Verification code sent to your email',
        userId: signInData.user.id,
        role: userData.role || 'student'
      });
    }

    // Step 2: Verify OTP and complete login
    if (step === 'otp') {
      // Validate OTP code
      if (!otpCode || otpCode.length !== 6) {
        return NextResponse.json({ 
          error: 'Please enter a valid 6-digit verification code' 
        }, { status: 400 });
      }
      
      // Verify OTP
      const otpResult = await verifyLoginOTP(email, otpCode);
      
      if (!otpResult.success) {
        return NextResponse.json({ 
          error: otpResult.error 
        }, { status: 400 });
      }
      
      // Get user role for redirect
      const supabase = await createClient();
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('email', email)
        .single();
      
      if (userError) {
        console.error('Error fetching user role:', userError);
        // Default to student role if there's an error
        return NextResponse.json({ 
          success: true, 
          step: 'complete',
          role: 'student',
          message: 'Login successful'
        });
      }
      
      return NextResponse.json({ 
        success: true, 
        step: 'complete',
        role: userData.role || 'student',
        message: 'Login successful'
      });
    }
    
    // If no step specified, default to credentials step
    return NextResponse.json({ 
      error: 'Invalid request. Please specify step parameter.' 
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ 
      error: error.message || 'An error occurred during login' 
    }, { status: 500 });
  }
}