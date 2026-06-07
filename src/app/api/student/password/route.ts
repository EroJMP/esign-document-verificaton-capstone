import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse, createErrorResponse } from '@/lib/auth-helpers';

export async function POST(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return createUnauthorizedResponse();
    }
    
    const { currentPassword, newPassword } = await req.json();
    
    if (!currentPassword || !newPassword) {
      return createErrorResponse('Current password and new password are required', 400);
    }
    
    if (newPassword.length < 6) {
      return createErrorResponse('New password must be at least 6 characters long', 400);
    }
    
    // Update password using Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (updateError) {
      console.error('Password update error:', updateError);
      return createErrorResponse('Failed to update password. Please check your current password.');
    }
    
    return NextResponse.json({ success: true, message: 'Password updated successfully' });
    
  } catch (error: any) {
    console.error('Error in POST /api/student/password:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}