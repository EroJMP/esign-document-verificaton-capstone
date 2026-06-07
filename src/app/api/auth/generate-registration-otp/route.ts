import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOTP } from '@/lib/otp-service';

export async function POST(req: NextRequest) {
  try {
    const { email, firstName, lastName } = await req.json();
    
    // Validate input
    if (!email || !firstName || !lastName) {
      return NextResponse.json({ 
        error: 'Email, first name, and last name are required' 
      }, { status: 400 });
    }

    // Validate email domain
    if (!email.endsWith('@plpasig.edu.ph')) {
      return NextResponse.json({ 
        error: 'Email must end with @plpasig.edu.ph' 
      }, { status: 400 });
    }

    // Generate and send OTP
    const result = await generateRegistrationOTP(email, firstName, lastName);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: result.message,
      expiresAt: result.expiresAt
    });
    
  } catch (error: any) {
    console.error('Registration OTP generation error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
