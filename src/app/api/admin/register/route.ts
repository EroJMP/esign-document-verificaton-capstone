import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, firstName, lastName, password } = body;

    // Validate inputs
    if (!token || !firstName || !lastName || !password) {
      return NextResponse.json({ 
        error: 'All fields are required' 
      }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ 
        error: 'Password must be at least 6 characters long' 
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Find valid invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('admin_invitations')
      .select('email, expires_at, is_used, invited_by')
      .eq('invitation_token', token)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json({ 
        error: 'Invalid or expired invitation token' 
      }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('email', invitation.email)
      .single();

    if (existingUser) {
      return NextResponse.json({ 
        error: 'User with this email already exists' 
      }, { status: 400 });
    }

    // Create admin user - try service role first, fallback to regular signup
    let authData, authError;
    
    // Try service role if available
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const result = await serviceSupabase.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: 'admin'
        }
      });
      
      authData = result.data;
      authError = result.error;
    } else {
      const result = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'admin'
          }
        }
      });
      
      authData = result.data;
      authError = result.error;
    }

    if (authError) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json({ 
        error: 'Failed to create user account' 
      }, { status: 500 });
    }

    if (authData.user) {
      // Generate a placeholder password hash for the users table
      const placeholderHash = crypto.createHash('sha256').update(password).digest('hex');
      
      // Insert user profile
      // Use service role client for profile creation if available
      const profileClient = process.env.SUPABASE_SERVICE_ROLE_KEY 
        ? createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
        : supabase;
      
      const { error: profileError } = await profileClient
        .from('users')
        .insert({
          id: authData.user.id,
          email: invitation.email,
          password_hash: placeholderHash,
          role: 'admin',
          first_name: firstName,
          last_name: lastName,
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        return NextResponse.json({ 
          error: 'Failed to create user profile' 
        }, { status: 500 });
      }

      // Mark invitation as used
      const { error: updateInvitationError } = await supabase
        .from('admin_invitations')
        .update({ is_used: true })
        .eq('invitation_token', token);

      if (updateInvitationError) {
        console.error('Error updating invitation:', updateInvitationError);
        // Don't fail the registration for this
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Admin account created successfully',
        user: {
          id: authData.user.id,
          email: invitation.email,
          first_name: firstName,
          last_name: lastName,
          role: 'admin'
        }
      });
    }

    return NextResponse.json({ 
      error: 'Failed to create user account' 
    }, { status: 500 });

  } catch (error: any) {
    console.error('Admin registration API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
