import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse, createErrorResponse } from '@/lib/auth-helpers';
import { canUserAccessForm } from '@/lib/form-access-control';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return createUnauthorizedResponse();
    }
    
    const { id: formId } = await params;
    const url = new URL(req.url);
    const token = url.searchParams.get('accessToken') || url.searchParams.get('token');
    const resubmitFlag = url.searchParams.get('resubmit');
    const submissionIdFromQuery = url.searchParams.get('submission');
    let allowAvailabilityBypass = false;
    
    // If token is provided, validate it (without creating audit trail entries)
    if (token) {
      // Get current Singapore time to match database timezone
      const now = new Date();
      const singaporeTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
      
      // Validate access token without using RPC function to avoid audit trail logging
      const { data: linkData, error: linkError } = await supabase
        .from('form_access_links')
        .select(`
          form_id,
          expires_at,
          forms!form_access_links_form_id_fkey(
            id,
            title,
            description,
            status,
            template_url,
            template_filename,
            available_from,
            available_until
          )
        `)
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
      
      // Check if the form is active or published
      const formStatus = (linkData.forms as any)?.status;
      if (formStatus !== 'active' && formStatus !== 'published') {
        return createErrorResponse('Form is not currently available for submissions', 403);
      }
      
      // For token-based access, we need to check if the current user is assigned to the form
      // Get the full form details to check assignment
      const { data: fullFormData, error: fullFormError } = await supabase
        .from('forms')
        .select(`
          id, title, description, status, available_from, available_until,
          assigned_college_department, assigned_courses, assigned_students
        `)
        .eq('id', formId)
        .single();
      
      if (fullFormError || !fullFormData) {
        return createErrorResponse('Form not found', 404);
      }
      
      // For token-based access with authenticated users, check all assignment types
      // Get user's profile information for access control
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
      
      // Use the access control function to check all assignment types
      if (!canUserAccessForm(userForAccessControl, fullFormData)) {
        return createErrorResponse('You do not have access to this form based on your college department and course assignment. Please contact the administration if you believe this is an error.', 403);
      }
      
      // Token is valid and user has access, proceed with form fetch
    }
    
    // Get current Singapore time for availability checks
    const now = new Date();
    const singaporeTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
    
    // Fetch the form details with assignment information
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select(`
        id,
        title,
        description,
        pdf_template,
        template_url,
        template_filename,
        available_from,
        available_until,
        assigned_college_department,
        assigned_courses,
        assigned_students,
        status,
        created_at
      `)
      .eq('id', formId)
      .single();
    
    if (formError) {
      return createErrorResponse('Form not found', 404);
    }
    
    // If resubmit flag is present, verify that the student has a rejected submission for this form
    if (!token && resubmitFlag && submissionIdFromQuery) {
      const { data: existingSubmission, error: existingError } = await supabase
        .from('submissions')
        .select('id, status, student_id, form_id')
        .eq('id', submissionIdFromQuery)
        .eq('form_id', formId)
        .eq('student_id', user.id)
        .single();

      if (!existingError && existingSubmission && existingSubmission.status === 'rejected') {
        allowAvailabilityBypass = true;
      }
    }

    // Check if the form is active or published (for regular access without token)
    if (!token && form.status !== 'active' && form.status !== 'published' && !allowAvailabilityBypass) {
      return createErrorResponse('Form is not currently available for submissions', 403);
    }
    
    // Check form availability window using Singapore timezone
    console.log('🕐 Student Form Detail API - Using Singapore Time:', singaporeTime.toISOString());
    
    // Convert database timestamps to Singapore timezone for proper comparison
    let availableFromSG = null;
    let availableUntilSG = null;
    
    if (form.available_from) {
      // Database stores Singapore time, convert to UTC for comparison
      const dbDate = new Date(form.available_from);
      availableFromSG = new Date(dbDate.getTime() - (8 * 60 * 60 * 1000)); // Subtract 8 hours
    }
    
    if (form.available_until) {
      // Database stores Singapore time, convert to UTC for comparison
      const dbDate = new Date(form.available_until);
      availableUntilSG = new Date(dbDate.getTime() - (8 * 60 * 60 * 1000)); // Subtract 8 hours
    }
    
    console.log('📅 Student Form Detail availability debug:');
    if (form.available_from) console.log('  Available From (DB):', form.available_from, '-> Converted:', availableFromSG?.toISOString());
    if (form.available_until) console.log('  Available Until (DB):', form.available_until, '-> Converted:', availableUntilSG?.toISOString());
    
    if (availableFromSG && singaporeTime < availableFromSG && !allowAvailabilityBypass) {
      console.log('❌ Form not yet available - Current:', singaporeTime.toISOString(), 'Available From:', availableFromSG.toISOString());
      return createErrorResponse('Form is not yet available for submissions', 403);
    }
    if (availableUntilSG && singaporeTime > availableUntilSG && !allowAvailabilityBypass) {
      console.log('❌ Form no longer available - Current:', singaporeTime.toISOString(), 'Available Until:', availableUntilSG.toISOString());
      return createErrorResponse('Form is no longer available for submissions', 403);
    }
    
    console.log('✅ Student Form Detail - Form is available');

    // For regular access (without token), check assignment permissions
    // Note: for rejected resubmissions (allowAvailabilityBypass = true),
    // we skip this assignment check so students can still access the form
    if (!token && !allowAvailabilityBypass) {
      // Get user's profile information for access control
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

      if (!canUserAccessForm(userForAccessControl, form)) {
        return createErrorResponse('You do not have access to this form. Please contact the administration if you believe this is an error.', 403);
      }
    }
    
    // Get existing submission if any (for display purposes only)
    const { data: submission } = await supabase
      .from('submissions')
      .select('id, status, created_at, updated_at')
      .eq('form_id', formId)
      .eq('student_id', user.id)
      .single();
    
    // Fetch form fields
    const { data: fields, error: fieldsError } = await supabase
      .from('form_fields')
      .select('*')
      .eq('form_id', formId)
      .order('created_at');
    
    if (fieldsError) {
      return createErrorResponse('Failed to fetch form fields');
    }
    
    return NextResponse.json({
      form: {
        ...form,
        form_fields: fields || []
      },
      submission: submission || null
    });
    
  } catch (error: any) {
    return createErrorResponse(error.message || 'An error occurred');
  }
}