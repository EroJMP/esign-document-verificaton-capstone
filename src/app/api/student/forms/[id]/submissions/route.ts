import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse, createErrorResponse } from '@/lib/auth-helpers';
import { canUserAccessForm } from '@/lib/form-access-control';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return createUnauthorizedResponse();
    }
    
    const { id: formId } = await params;
    
    // Handle request body safely
    let body: any = {};
    let token: string | null = null;
    
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
        token = body?.token || null;
      }
    } catch (error) {
      // If no body or invalid JSON, continue without token
    }
    
    // Get current Singapore time for all checks
    const now = new Date();
    const singaporeTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
    console.log('🕐 Submissions API - Using Singapore Time:', singaporeTime.toISOString());
    
    // Get the form details first to check access
    const { data: formData, error: formError } = await supabase
      .from('forms')
      .select(`
        id,
        title,
        status,
        available_from,
        available_until,
        assigned_college_department,
        assigned_courses,
        assigned_students
      `)
      .eq('id', formId)
      .single();
    
    if (formError || !formData) {
      return createErrorResponse('Form not found', 404);
    }
    
    // Check if form is published or active
    if (formData.status !== 'active' && formData.status !== 'published') {
      return createErrorResponse('Form is not currently available for submissions', 403);
    }
    
    // Check form availability window using Singapore timezone
    // Convert database timestamps to Singapore timezone for proper comparison
    let availableFromSG = null;
    let availableUntilSG = null;
    
    if (formData.available_from) {
      // Database stores Singapore time, convert to UTC for comparison
      const dbDate = new Date(formData.available_from);
      availableFromSG = new Date(dbDate.getTime() - (8 * 60 * 60 * 1000)); // Subtract 8 hours
    }
    
    if (formData.available_until) {
      // Database stores Singapore time, convert to UTC for comparison
      const dbDate = new Date(formData.available_until);
      availableUntilSG = new Date(dbDate.getTime() - (8 * 60 * 60 * 1000)); // Subtract 8 hours
    }
    
    console.log('📅 Submissions API availability debug:');
    console.log('  Current Singapore Time:', singaporeTime.toISOString());
    if (formData.available_from) console.log('  Available From (DB):', formData.available_from, '-> Converted:', availableFromSG?.toISOString());
    if (formData.available_until) console.log('  Available Until (DB):', formData.available_until, '-> Converted:', availableUntilSG?.toISOString());
    
    if (availableFromSG && singaporeTime < availableFromSG) {
      console.log('❌ Form not yet available - Current:', singaporeTime.toISOString(), 'Available From:', availableFromSG.toISOString());
      return createErrorResponse('Form is not yet available for submissions', 403);
    }
    if (availableUntilSG && singaporeTime > availableUntilSG) {
      console.log('❌ Form no longer available - Current:', singaporeTime.toISOString(), 'Available Until:', availableUntilSG.toISOString());
      return createErrorResponse('Form is no longer available for submissions', 403);
    }
    
    console.log('✅ Submissions API - Form is available');
    
    // If token is provided, validate it (without creating audit trail entries)
    if (token) {
      // Validate access token without using RPC function to avoid audit trail logging
      const { data: linkData, error: linkError } = await supabase
        .from('form_access_links')
        .select('form_id, expires_at')
        .eq('access_token', token)
        .gt('expires_at', singaporeTime.toISOString())
        .single();
      
      if (linkError || !linkData) {
        return createErrorResponse('Invalid or expired access token', 403);
      }
      
      // Verify the form ID matches
      if (linkData.form_id !== formId) {
        return createErrorResponse('Access token does not match this form', 403);
      }
    }
    
    // Check access control - verify user has permission to access this form
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('college_department, course')
      .eq('id', user.id)
      .single();
    
    if (userError) {
      return createErrorResponse('Failed to fetch user profile', 500);
    }
    
    const userForAccessControl = {
      id: user.id,
      college_department: userProfile.college_department,
      course: userProfile.course
    };
    
    if (!canUserAccessForm(userForAccessControl, formData)) {
      return createErrorResponse('You do not have access to this form based on your college department and course assignment. Please contact the administration if you believe this is an error.', 403);
    }
    
    // Check if submission already exists
    const { data: existingSubmission } = await supabase
      .from('submissions')
      .select('id, status')
      .eq('form_id', formId)
      .eq('student_id', user.id)
      .single();
    
    if (existingSubmission) {
      return NextResponse.json({ 
        submission: existingSubmission,
        message: 'Submission already exists'
      });
    }
    
    // Create new submission
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .insert({
        form_id: formId,
        student_id: user.id,
        status: 'in_progress'
      })
      .select()
      .single();
    
    if (submissionError) {
      console.error('Error creating submission:', submissionError);
      return createErrorResponse('Failed to create submission');
    }
    
    return NextResponse.json({ 
      submission,
      message: 'Submission created successfully'
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error in POST /api/student/forms/[id]/submissions:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}