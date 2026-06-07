import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch all mobile app codes
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Fetch all codes with creator info
    const { data: codes, error: codesError } = await supabase
      .from('admin_mobile_app_login')
      .select(`
        id,
        code,
        created_by,
        created_at,
        expires_at,
        is_active,
        last_used_at,
        usage_count,
        users!admin_mobile_app_login_created_by_fkey(
          email,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    if (codesError) {
      console.error('Error fetching codes:', codesError);
      return NextResponse.json(
        { error: 'Failed to fetch codes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ codes });
  } catch (error) {
    console.error('Error in GET /api/admin/mobile-app-codes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Generate new mobile app code
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { daysValid } = body;

    if (!daysValid || daysValid < 1 || daysValid > 365) {
      return NextResponse.json(
        { error: 'Invalid days valid (must be between 1 and 365)' },
        { status: 400 }
      );
    }

    // Generate unique 6-digit code
    let code = '';
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      // Generate random 6-digit code
      code = Math.floor(100000 + Math.random() * 900000).toString();

      // Check if code already exists
      const { data: existingCode } = await supabase
        .from('admin_mobile_app_login')
        .select('id')
        .eq('code', code)
        .maybeSingle();

      if (!existingCode) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return NextResponse.json(
        { error: 'Failed to generate unique code, please try again' },
        { status: 500 }
      );
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysValid);

    // Insert new code
    const { data: newCode, error: insertError } = await supabase
      .from('admin_mobile_app_login')
      .insert({
        code,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .select(`
        id,
        code,
        created_by,
        created_at,
        expires_at,
        is_active,
        last_used_at,
        usage_count
      `)
      .single();

    if (insertError) {
      console.error('Error creating code:', insertError);
      return NextResponse.json(
        { error: 'Failed to create code' },
        { status: 500 }
      );
    }

    return NextResponse.json({ code: newCode }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/mobile-app-codes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

