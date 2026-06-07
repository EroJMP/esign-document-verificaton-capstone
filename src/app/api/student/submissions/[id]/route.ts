import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse, createErrorResponse } from '@/lib/auth-helpers';

/**
 * DELETE /api/student/submissions/[id]
 * Delete a submission and allow the student to resubmit the form
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return createUnauthorizedResponse();
    }
    
    const { id: submissionId } = await Promise.resolve(params);
    
    // Verify the submission belongs to the user
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('id, form_id, student_id, status')
      .eq('id', submissionId)
      .eq('student_id', user.id)
      .single();
    
    if (submissionError || !submission) {
      return createErrorResponse('Submission not found or access denied', 404);
    }
    
    // Only allow deletion of completed or rejected submissions
    if (!['completed', 'rejected'].includes(submission.status)) {
      return createErrorResponse('Only completed or rejected submissions can be deleted', 400);
    }
    
    // Delete the submission and all related data
    // Note: field_values and student_audit_trail should be deleted via CASCADE
    const { error: deleteError } = await supabase
      .from('submissions')
      .delete()
      .eq('id', submissionId);
    
    if (deleteError) {
      console.error('Error deleting submission:', deleteError);
      return createErrorResponse(`Failed to delete submission: ${deleteError.message}`, 500);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Submission deleted successfully',
      submission_id: submissionId
    });
    
  } catch (error: any) {
    console.error('Error in DELETE /api/student/submissions/[id]:', error);
    return createErrorResponse(error.message || 'An error occurred', 500);
  }
}