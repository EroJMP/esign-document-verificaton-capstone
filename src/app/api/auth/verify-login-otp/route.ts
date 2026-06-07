import { NextRequest, NextResponse } from 'next/server';
import { verifyLoginOTP } from '@/lib/otp-service';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { email, otpCode, userId } = await req.json();
    
    // Validate input
    if (!email || !otpCode || !userId) {
      return NextResponse.json({ 
        error: 'Email, OTP code, and user ID are required' 
      }, { status: 400 });
    }

    if (otpCode.length !== 6) {
      return NextResponse.json({ 
        error: 'Please enter a valid 6-digit verification code' 
      }, { status: 400 });
    }

    // Verify OTP
    const result = await verifyLoginOTP(email, otpCode);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error 
      }, { status: 400 });
    }

    // Get user role for redirect
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Error fetching user role:', userError);
      // Default to student role if there's an error
      return NextResponse.json({ 
        success: true, 
        message: result.message,
        role: 'student'
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: result.message,
      role: userData.role || 'student'
    });
    
  } catch (error: any) {
    console.error('Login OTP verification error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
