import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

// PATCH /api/admin/forms/[id]/submissions/[submissionId]/verify - Verify a submission
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const { id: formId, submissionId } = await Promise.resolve(params);
    let action: 'verify' | 'reject' = 'verify';
    let rejectionReason: string | null = null;

    try {
      const body = await req.json();
      if (body && typeof body === 'object') {
        if (body.action === 'reject') {
          action = 'reject';
        }
        if (typeof body.reason === 'string') {
          rejectionReason = body.reason.trim();
        }
      }
    } catch {
      // Ignore JSON parse errors; default to verify
    }
    
    if (action === 'reject' && (!rejectionReason || rejectionReason.length < 5)) {
      return createErrorResponse('Rejection reason must be at least 5 characters long', 400);
    }
    
    // Verify the submission exists and belongs to the form
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('id, status, form_id')
      .eq('id', submissionId)
      .eq('form_id', formId)
      .single();
    
    if (submissionError || !submission) {
      return createErrorResponse('Submission not found', 404);
    }

    // Check if submission is in a state that can be verified
    const allowedStatuses = ['completed', 'submitted', 'rejected', 'verified'];
    if (!allowedStatuses.includes(submission.status)) {
      return createErrorResponse('Only completed, submitted, rejected, or verified submissions can be reviewed', 400);
    }

    const nowIso = new Date().toISOString();
    const updatePayload =
      action === 'reject'
        ? {
            status: 'rejected',
            rejection_reason: rejectionReason,
            updated_at: nowIso
          }
        : {
            status: 'verified',
            rejection_reason: null,
            updated_at: nowIso
          };

    const { data: updatedSubmission, error: updateError } = await supabase
      .from('submissions')
      .update(updatePayload)
      .eq('id', submissionId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating submission:', updateError);
      return createErrorResponse('Failed to verify submission', 500);
    }
    
    return NextResponse.json({
      success: true,
      submission: updatedSubmission,
      message: action === 'reject' ? 'Submission rejected successfully' : 'Submission verified successfully'
    });
    
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/forms/[id]/submissions/[submissionId]/verify:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}

