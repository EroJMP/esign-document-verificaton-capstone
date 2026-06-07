import { NextRequest, NextResponse } from 'next/server';
import { generateLoginOTP } from '@/lib/otp-service';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required' 
      }, { status: 400 });
    }

    // Create server client
    const supabase = await createClient();
    
    // Verify credentials first
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (signInError) {
      return NextResponse.json({ 
        error: 'Invalid email or password' 
      }, { status: 400 });
    }
    
    if (!signInData.user) {
      return NextResponse.json({ 
        error: 'Authentication failed' 
      }, { status: 400 });
    }

    // Get user details for OTP email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', signInData.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ 
        error: 'Failed to fetch user details' 
      }, { status: 500 });
    }

    // Generate and send OTP
    const result = await generateLoginOTP(email, userData.first_name, userData.last_name);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: result.message,
      expiresAt: result.expiresAt,
      userId: signInData.user.id
    });
    
  } catch (error: any) {
    console.error('Login OTP generation error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
