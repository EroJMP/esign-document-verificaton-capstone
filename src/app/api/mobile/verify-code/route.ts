import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST - Verify mobile app code
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Parse request body
    const body = await req.json();
    const { code } = body;

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid code format', valid: false },
        { status: 400 }
      );
    }

    // Fetch code from database
    const { data: codeData, error: codeError } = await supabase
      .from('admin_mobile_app_login')
      .select('id, code, expires_at, is_active, usage_count')
      .eq('code', code)
      .maybeSingle();

    if (codeError) {
      console.error('Error fetching code:', codeError);
      return NextResponse.json(
        { error: 'Failed to verify code', valid: false },
        { status: 500 }
      );
    }

    // Check if code exists
    if (!codeData) {
      return NextResponse.json(
        { error: 'Invalid code', valid: false },
        { status: 404 }
      );
    }

    // Check if code is active
    if (!codeData.is_active) {
      return NextResponse.json(
        { error: 'Code has been deactivated', valid: false },
        { status: 403 }
      );
    }

    // Check if code has expired
    const now = new Date();
    const expiresAt = new Date(codeData.expires_at);

    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Code has expired', valid: false, expired: true },
        { status: 403 }
      );
    }

    // Update usage statistics
    const { error: updateError } = await supabase
      .from('admin_mobile_app_login')
      .update({
        last_used_at: new Date().toISOString(),
        usage_count: codeData.usage_count + 1,
      })
      .eq('id', codeData.id);

    if (updateError) {
      console.error('Error updating code usage:', updateError);
      // Don't fail the request if usage update fails
    }

    // Return success with expiration info
    return NextResponse.json({
      valid: true,
      expiresAt: codeData.expires_at,
      message: 'Code verified successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/mobile/verify-code:', error);
    return NextResponse.json(
      { error: 'Internal server error', valid: false },
      { status: 500 }
    );
  }
}

