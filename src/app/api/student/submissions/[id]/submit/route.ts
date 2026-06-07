import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse, createErrorResponse } from '@/lib/auth-helpers';
import { sendGuardianNotification } from '@/lib/email-service';
import { createClient } from '@supabase/supabase-js';
import { generatePDFForSubmission } from '@/lib/pdf-generator';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return createUnauthorizedResponse();
    }
    
    const { id: submissionId } = await params;
    
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (jsonError) {
      console.error('Failed to parse request JSON:', jsonError);
      return createErrorResponse('Invalid request body', 400);
    }
    
    const { fieldValues, qrCode } = requestBody;
    
    if (!fieldValues || !Array.isArray(fieldValues)) {
      return createErrorResponse('Field values are required', 400);
    }
    
    // Verify the submission belongs to the user
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('id, form_id, status')
      .eq('id', submissionId)
      .eq('student_id', user.id)
      .single();
    
    if (submissionError) {
      console.error('Error fetching submission:', submissionError);
      return createErrorResponse('Submission not found', 404);
    }
    
    if (submission.status === 'completed') {
      return createErrorResponse('Submission already completed', 400);
    }
    
    // Use the submit_form RPC function
    const { data: result, error: submitError } = await supabase
      .rpc('submit_form', {
        p_submission_id: submissionId,
        p_field_values: fieldValues,
        p_qr_code: qrCode || null
      });
    
    if (submitError) {
      console.error('Error submitting form:', submitError);
      return createErrorResponse(`Failed to submit form: ${submitError.message}`);
    }
    
    if (result && result.error) {
      console.error('RPC returned error:', result.error);
      return createErrorResponse(result.error);
    }
    
    // Refetch submission data to get updated submitted_at timestamp
    const { data: updatedSubmission, error: refetchError } = await supabase
      .from('submissions')
      .select('id, form_id, student_id, status, created_at, submitted_at')
      .eq('id', submissionId)
      .single();
    
    if (refetchError) {
      console.error('Error refetching submission:', refetchError);
      return createErrorResponse('Failed to refetch submission data', 500);
    }
    
    
    // Log form_submitted action to student_audit_trail before PDF generation
    try {
      const { error: auditError } = await supabase
        .rpc('log_student_action', {
          p_submission_id: submissionId,
          p_student_id: user.id,
          p_form_id: submission.form_id,
          p_action: 'form_submitted',
          p_field_id: null,
          p_field_label: null,
          p_field_value: null,
          p_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
          p_user_agent: req.headers.get('user-agent') || 'unknown',
          p_details: null
        });
      
      if (auditError) {
        console.error('Error logging form_submitted action:', auditError);
        // Continue anyway, audit logging is not critical
      }
    } catch (auditError) {
      console.error('Error during audit logging:', auditError);
      // Continue anyway, audit logging is not critical
    }
    
    // Send email notification to guardian after successful submission
    try {
      // Get user details including guardian email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('first_name, last_name, guardian_email')
        .eq('id', user.id)
        .single();
      
      if (userError) {
        console.error('Error fetching user data:', userError);
      } else if (userData?.guardian_email) {
        // Get form details
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select('title, description')
          .eq('id', submission.form_id)
          .single();
        
        if (formError) {
          console.error('Error fetching form data:', formError);
        } else if (formData) {
          // Generate PDF directly, then send email
          try {
            // Generate PDF using the shared function
            const pdfResult = await generatePDFForSubmission(submissionId, submission.form_id, user.id);
            
            if (pdfResult.success) {
              // Send email notification with the generated PDF
              const emailResult = await sendGuardianNotification({
                studentName: `${userData.first_name} ${userData.last_name}`,
                formTitle: formData.title,
                formDescription: formData.description || 'No description provided',
                submissionDate: new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }),
                pdfBuffer: pdfResult.pdfBuffer,
                guardianEmail: userData.guardian_email
              });
              
              if (emailResult.success) {
                console.log('Guardian notification sent successfully');
              } else {
                console.error('Failed to send guardian notification:', emailResult.error);
              }
            } else {
              console.error('Failed to generate PDF for email');
            }
          } catch (pdfError) {
            console.error('Error generating PDF for email:', pdfError);
          }
        }
      } else {
        console.log('No guardian email found for user, skipping notification');
      }
    } catch (emailError) {
      console.error('Error sending guardian notification:', emailError);
      // Don't fail the submission if email fails
    }
    
    return NextResponse.json({
      success: true,
      submission_id: submissionId,
      message: 'Form submitted successfully'
    });
    
  } catch (error: any) {
    console.error('Error in POST /api/student/submissions/[id]/submit:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}