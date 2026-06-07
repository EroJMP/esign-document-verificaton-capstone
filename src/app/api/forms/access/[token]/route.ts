import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession, createErrorResponse } from '@/lib/auth-helpers';
import { canUserAccessForm } from '@/lib/form-access-control';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { session, user, supabase, error } = await getAuthenticatedSession();
    
    // This endpoint can work without authentication for public access
    // If no session, create a client without auth
    let supabaseClient = supabase;
    let isAuthenticated = !!session;
    
    if (error || !session) {
      // Create a public client for token validation
      const { createClient } = await import('@supabase/supabase-js');
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        return createErrorResponse('Supabase configuration missing', 500);
      }
      
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      isAuthenticated = false;
    }
    
    const { token } = await params;
    
    if (isAuthenticated) {
      // For authenticated users, validate token without using RPC function to avoid audit trail logging
      // Get current Singapore time to match database timezone
      const now = new Date();
      const singaporeTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
      
      console.log('🕐 Forms Access Token API (Authenticated) - Using Singapore Time:', singaporeTime.toISOString());
      
      const { data: linkData, error: linkError } = await supabaseClient
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
        console.error('Error validating access token:', linkError);
        return createErrorResponse('Invalid or expired access token', 403);
      }
      
      // Check if the form is active or published
      const formStatus = (linkData.forms as { status: string })?.status;
      if (formStatus !== 'active' && formStatus !== 'published') {
        return createErrorResponse('Form is not currently available for submissions', 403);
      }
      
      // Check form availability window using Singapore timezone
      const form = linkData.forms as any;
      
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
      
      console.log('📅 Form availability debug (Authenticated):');
      console.log('  Current Singapore Time:', singaporeTime.toISOString());
      if (form.available_from) console.log('  Available From (DB):', form.available_from, '-> Converted:', availableFromSG?.toISOString());
      if (form.available_until) console.log('  Available Until (DB):', form.available_until, '-> Converted:', availableUntilSG?.toISOString());
      
      if (availableFromSG && singaporeTime < availableFromSG) {
        console.log('❌ Form not yet available - Current:', singaporeTime.toISOString(), 'Available From:', availableFromSG.toISOString());
        return createErrorResponse('Form is not yet available for submissions', 403);
      }
      if (availableUntilSG && singaporeTime > availableUntilSG) {
        console.log('❌ Form no longer available - Current:', singaporeTime.toISOString(), 'Available Until:', availableUntilSG.toISOString());
        return createErrorResponse('Form is no longer available for submissions', 403);
      }
      
      console.log('✅ Form is available for submissions');
      
      // For authenticated users with tokens, verify they meet the form's assignment requirements
      // Get full form details including assignment information
      const { data: fullFormData, error: fullFormError } = await supabaseClient
        .from('forms')
        .select(`
          id,
          title,
          description,
          status,
          available_from,
          available_until,
          assigned_college_department,
          assigned_courses,
          assigned_students
        `)
        .eq('id', linkData.form_id)
        .single();
      
      if (fullFormError || !fullFormData) {
        return createErrorResponse('Form not found', 404);
      }
      
      // Check if the authenticated user has access to this form based on assignments
      if (user?.id) {
        // Get user's profile information for access control
        const { data: userProfile, error: userError } = await supabaseClient
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
        
        if (!canUserAccessForm(userForAccessControl, fullFormData)) {
          return createErrorResponse('You do not have access to this form.', 403);
        }
      }
      
      // Get form fields
      const { data: fieldsData, error: fieldsError } = await supabaseClient
        .from('form_fields')
        .select('*')
        .eq('form_id', linkData.form_id)
        .order('created_at');
      
      if (fieldsError) {
        console.error('Error fetching form fields:', fieldsError);
        return createErrorResponse('Failed to fetch form fields', 500);
      }
      
      // Check if user already has a submission for this form
      const { data: existingSubmission } = await supabaseClient
        .from('submissions')
        .select('id')
        .eq('form_id', linkData.form_id)
        .eq('student_id', user?.id)
        .single();
      
      // Return the complete form data
      return NextResponse.json({
        success: true,
        form: linkData.forms,
        fields: fieldsData || [],
        submission_id: existingSubmission?.id || null,
        token: token,
        authenticated: isAuthenticated,
        message: 'Access token validated successfully'
      });
    } else {
      // For unauthenticated users, just validate the token and return form info
      // Get current Singapore time to match database timezone
      const now = new Date();
      const singaporeTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
      
      console.log('🕐 Forms Access Token API (Unauthenticated) - Using Singapore Time:', singaporeTime.toISOString());
      
      const { data: linkData, error: linkError } = await supabaseClient
        .from('form_access_links')
        .select(`
          id,
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
        console.error('Error validating access token:', linkError);
        return createErrorResponse('Invalid or expired access token', 403);
      }
      
      // Check if the form is active or published
      const formStatus = (linkData.forms as { status: string })?.status;
      if (formStatus !== 'active' && formStatus !== 'published') {
        return createErrorResponse('Form is not currently available for submissions', 403);
      }
      
      // Check form availability window using Singapore timezone
      const form = linkData.forms as any;
      
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
      
      console.log('📅 Form availability debug (Unauthenticated):');
      console.log('  Current Singapore Time:', singaporeTime.toISOString());
      if (form.available_from) console.log('  Available From (DB):', form.available_from, '-> Converted:', availableFromSG?.toISOString());
      if (form.available_until) console.log('  Available Until (DB):', form.available_until, '-> Converted:', availableUntilSG?.toISOString());
      
      if (availableFromSG && singaporeTime < availableFromSG) {
        console.log('❌ Form not yet available - Current:', singaporeTime.toISOString(), 'Available From:', availableFromSG.toISOString());
        return createErrorResponse('Form is not yet available for submissions', 403);
      }
      if (availableUntilSG && singaporeTime > availableUntilSG) {
        console.log('❌ Form no longer available - Current:', singaporeTime.toISOString(), 'Available Until:', availableUntilSG.toISOString());
        return createErrorResponse('Form is no longer available for submissions', 403);
      }
      
      console.log('✅ Form is available for submissions');
      
      // Get form fields
      const { data: fieldsData, error: fieldsError } = await supabaseClient
        .from('form_fields')
        .select('*')
        .eq('form_id', linkData.form_id)
        .order('created_at');
      
      if (fieldsError) {
        console.error('Error fetching form fields:', fieldsError);
        return createErrorResponse('Failed to fetch form fields', 500);
      }
      
      // Return form data for unauthenticated users
      return NextResponse.json({
        success: true,
        form: linkData.forms,
        fields: fieldsData || [],
        submission_id: null, // No submission for unauthenticated users
        token: token,
        authenticated: false,
        message: 'Access token validated successfully'
      });
    }
    
  } catch (error: unknown) {
    console.error('Error in GET /api/forms/access/[token]:', error);
    return createErrorResponse((error as Error).message || 'An error occurred');
  }
}