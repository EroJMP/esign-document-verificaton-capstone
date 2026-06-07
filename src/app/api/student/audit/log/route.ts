import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse, createErrorResponse } from '@/lib/auth-helpers';

/**
 * POST /api/student/audit/log
 * Log student actions in the audit trail
 */
export async function POST(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return createUnauthorizedResponse();
    }
    
    const body = await req.json();
    const {
      submission_id,
      form_id,
      action,
      field_id,
      field_label,
      field_value,
      details
    } = body;
    
    // Validate required fields
    if (!submission_id || !form_id || !action) {
      return createErrorResponse('Missing required fields: submission_id, form_id, action', 400);
    }
    
    // Validate action type
    const validActions = ['form_opened', 'field_filled', 'form_submitted'];
    if (!validActions.includes(action)) {
      return createErrorResponse(`Invalid action. Must be one of: ${validActions.join(', ')}`, 400);
    }
    
    // Get client IP and user agent
    const ip_address = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      'unknown';
    const user_agent = req.headers.get('user-agent') || 'unknown';
    
    // Verify the submission belongs to the user
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('id, student_id, form_id')
      .eq('id', submission_id)
      .eq('student_id', user.id)
      .single();
    
    if (submissionError || !submission) {
      return createErrorResponse('Submission not found or access denied', 404);
    }
    
    // Log the action using the database function (this goes to student_audit_trail, not audit_trail)
    const { data: auditId, error: logError } = await supabase
      .rpc('log_student_action', {
        p_submission_id: submission_id,
        p_student_id: user.id,
        p_form_id: form_id,
        p_action: action,
        p_field_id: field_id || null,
        p_field_label: field_label || null,
        p_field_value: field_value || null,
        p_ip_address: ip_address,
        p_user_agent: user_agent,
        p_details: details ? JSON.stringify(details) : null
      });
    
    if (logError) {
      console.error('Error logging student action:', logError);
      return createErrorResponse(`Failed to log action: ${logError.message}`, 500);
    }
    
    return NextResponse.json({
      success: true,
      audit_id: auditId,
      action: action,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Error in POST /api/student/audit/log:', error);
    return createErrorResponse(error.message || 'An error occurred', 500);
  }
}

