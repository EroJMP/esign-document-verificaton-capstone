import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationOTP } from '@/lib/otp-service';

export async function POST(req: NextRequest) {
  try {
    const { email, otpCode } = await req.json();
    
    // Validate input
    if (!email || !otpCode) {
      return NextResponse.json({ 
        error: 'Email and OTP code are required' 
      }, { status: 400 });
    }

    if (otpCode.length !== 6) {
      return NextResponse.json({ 
        error: 'Please enter a valid 6-digit verification code' 
      }, { status: 400 });
    }

    // Verify OTP
    const result = await verifyRegistrationOTP(email, otpCode);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: result.message
    });
    
  } catch (error: any) {
    console.error('Registration OTP verification error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
