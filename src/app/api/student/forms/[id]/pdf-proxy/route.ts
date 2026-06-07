import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse, createErrorResponse } from '@/lib/auth-helpers';
import { canUserAccessForm } from '@/lib/form-access-control';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params;
    
    // Check if this is an access token request or resubmit scenario
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const resubmitFlag = url.searchParams.get('resubmit');
    const submissionIdFromQuery = url.searchParams.get('submission');
    let allowAvailabilityBypass = false;
    
    let supabaseClient;
    let isAuthenticated = false;
    
    if (token) {
      // For access token requests, use public client
      const { createClient } = await import('@supabase/supabase-js');
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        return createErrorResponse('Supabase configuration missing', 500);
      }
      
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      
      // Get current Singapore time to match database timezone
      const now = new Date();
      const singaporeTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
      console.log('🕐 PDF Proxy API (Token) - Using Singapore Time:', singaporeTime.toISOString());
      
      // Validate the token
      const { data: linkData, error: linkError } = await supabaseClient
        .from('form_access_links')
        .select(`
          form_id,
          expires_at,
          forms!form_access_links_form_id_fkey(
            id,
            status
          )
        `)
        .eq('access_token', token)
        .eq('form_id', formId)
        .gt('expires_at', singaporeTime.toISOString())
        .single();
      
      if (linkError || !linkData) {
        return createErrorResponse('Invalid or expired access token', 403);
      }
      
      // Check if the form is active or published
      const formStatus = (linkData.forms as any)?.status;
      if (formStatus !== 'active' && formStatus !== 'published') {
        return createErrorResponse('Form is not currently available', 403);
      }
      
      // For token-based access, check if the student is assigned to the form
      const { data: fullFormData, error: fullFormError } = await supabaseClient
        .from('forms')
        .select(`
          id, title, status, available_from, available_until,
          assigned_college_department, assigned_courses, assigned_students
        `)
        .eq('id', formId)
        .single();
      
      if (fullFormError || !fullFormData) {
        return createErrorResponse('Form not found', 404);
      }
      
      // Check form availability window using Singapore timezone
      // Convert database timestamps to Singapore timezone for proper comparison
      let availableFromSG = null;
      let availableUntilSG = null;
      
      if (fullFormData.available_from) {
        // Database stores Singapore time, convert to UTC for comparison
        const dbDate = new Date(fullFormData.available_from);
        availableFromSG = new Date(dbDate.getTime() - (8 * 60 * 60 * 1000)); // Subtract 8 hours
      }
      
      if (fullFormData.available_until) {
        // Database stores Singapore time, convert to UTC for comparison
        const dbDate = new Date(fullFormData.available_until);
        availableUntilSG = new Date(dbDate.getTime() - (8 * 60 * 60 * 1000)); // Subtract 8 hours
      }
      
      console.log('📅 PDF Proxy (Token) availability debug:');
      console.log('  Current Singapore Time:', singaporeTime.toISOString());
      if (fullFormData.available_from) console.log('  Available From (DB):', fullFormData.available_from, '-> Converted:', availableFromSG?.toISOString());
      if (fullFormData.available_until) console.log('  Available Until (DB):', fullFormData.available_until, '-> Converted:', availableUntilSG?.toISOString());
      
      if (availableFromSG && singaporeTime < availableFromSG) {
        console.log('❌ Form not yet available - Current:', singaporeTime.toISOString(), 'Available From:', availableFromSG.toISOString());
        return createErrorResponse('Form is not yet available', 403);
      }
      if (availableUntilSG && singaporeTime > availableUntilSG) {
        console.log('❌ Form no longer available - Current:', singaporeTime.toISOString(), 'Available Until:', availableUntilSG.toISOString());
        return createErrorResponse('Form is no longer available', 403);
      }
      
      console.log('✅ PDF Proxy (Token) - Form is available');
      
      // For token-based access with authenticated users, check all assignment types
      const { data: { user: authUser }, error: userError } = await supabaseClient.auth.getUser();
      
      if (!userError && authUser) {
        // Get user's profile information for access control
        const { data: userProfile, error: profileError } = await supabaseClient
          .from('users')
          .select('college_department, course')
          .eq('id', authUser.id)
          .single();
        
        if (!profileError && userProfile) {
          const userForAccessControl = {
            id: authUser.id,
            college_department: userProfile.college_department,
            course: userProfile.course
          };
          
          // Use the access control function to check all assignment types
          if (!canUserAccessForm(userForAccessControl, fullFormData)) {
            return createErrorResponse('You do not have access to this form based on your college department and course assignment. Please contact the administration if you believe this is an error.', 403);
          }
        }
      }
    } else {
      // For authenticated requests, use authenticated client
      const { user, supabase, error } = await getAuthenticatedUser();
      
      if (error || !user) {
        return createUnauthorizedResponse();
      }
      
      supabaseClient = supabase;
      isAuthenticated = true;
      
      // Get current Singapore time for availability checks
      const now = new Date();
      const singaporeTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
      console.log('🕐 PDF Proxy API (Auth) - Using Singapore Time:', singaporeTime.toISOString());
      
      // Verify user has access to this form using the same access control logic
      const { data: form, error: formError } = await supabaseClient
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
      
      if (formError || !form) {
        return createErrorResponse('Form not found', 404);
      }

      // If resubmit flag is present, verify that the student has a rejected submission for this form
      if (resubmitFlag && submissionIdFromQuery) {
        const { data: existingSubmission, error: existingError } = await supabaseClient
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
      
      // Check form availability window using Singapore timezone
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
      
      console.log('📅 PDF Proxy (Auth) availability debug:');
      console.log('  Current Singapore Time:', singaporeTime.toISOString());
      if (form.available_from) console.log('  Available From (DB):', form.available_from, '-> Converted:', availableFromSG?.toISOString());
      if (form.available_until) console.log('  Available Until (DB):', form.available_until, '-> Converted:', availableUntilSG?.toISOString());
      
      if (availableFromSG && singaporeTime < availableFromSG && !allowAvailabilityBypass) {
        console.log('❌ Form not yet available - Current:', singaporeTime.toISOString(), 'Available From:', availableFromSG.toISOString());
        return createErrorResponse('Form is not yet available', 403);
      }
      if (availableUntilSG && singaporeTime > availableUntilSG && !allowAvailabilityBypass) {
        console.log('❌ Form no longer available - Current:', singaporeTime.toISOString(), 'Available Until:', availableUntilSG.toISOString());
        return createErrorResponse('Form is no longer available', 403);
      }
      
      console.log('✅ PDF Proxy (Auth) - Form is available');
      
      // Get user's profile for access control (skip for rejected resubmissions)
      if (!allowAvailabilityBypass) {
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

        if (!canUserAccessForm(userForAccessControl, form)) {
          return createErrorResponse('You do not have access to this form. Please contact the administration if you believe this is an error.', 403);
        }
      }
    }
    
    // Get the form's PDF template (reuse form data if already fetched)
    let pdfTemplate;
    if (isAuthenticated) {
      // We already have the form data, but we need to get the PDF template
      const { data: formWithTemplate, error: templateError } = await supabaseClient
        .from('forms')
        .select('pdf_template')
        .eq('id', formId)
        .single();
      
      if (templateError || !formWithTemplate?.pdf_template) {
        return createErrorResponse('PDF template not found', 404);
      }
      pdfTemplate = formWithTemplate.pdf_template;
    } else {
      // For token-based access, fetch form data
      const { data: formData, error: formError } = await supabaseClient
        .from('forms')
        .select('pdf_template')
        .eq('id', formId)
        .single();
      
      if (formError || !formData?.pdf_template) {
        return createErrorResponse('PDF template not found', 404);
      }
      pdfTemplate = formData.pdf_template;
    }
    
    // Get the PDF file from storage
    const { data: pdfData, error: downloadError } = await supabaseClient
      .storage
      .from('pdf-templates')
      .download(pdfTemplate);
    
    if (downloadError) {
      return createErrorResponse('Failed to load PDF template');
    }
    
    // Return the PDF with appropriate headers
    const response = new NextResponse(pdfData);
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    return response;
    
  } catch (error: unknown) {
    return createErrorResponse((error as Error).message || 'An error occurred');
  }
}