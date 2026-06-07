import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse, createErrorResponse } from '@/lib/auth-helpers';

// GET /api/student/submissions/[id]/details - Get submission details with form data
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return createUnauthorizedResponse();
    }
    
    const userId = user.id;
    const { id: submissionId } = await params;
    
    // Fetch submission details with form data
    const { data: submissionData, error: submissionError } = await supabase
      .from('submissions')
      .select('*, forms(*)')
      .eq('id', submissionId)
      .single();
      
    if (submissionError) {
      console.error('Error fetching submission:', submissionError);
      return createErrorResponse(`Failed to fetch submission: ${submissionError.message}`, 404);
    }
    
    if (!submissionData) {
      return createErrorResponse('Submission not found', 404);
    }
    
    // Verify the submission belongs to the authenticated user
    if (submissionData.student_id !== userId) {
      return createErrorResponse('Access denied', 403);
    }
    
    // Rename 'forms' to 'form' for consistency with the frontend
    const response = {
      ...submissionData,
      form: submissionData.forms,
      forms: undefined
    };
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('Error in GET /api/student/submissions/[id]/details:', error);
    return createErrorResponse(error.message || 'An error occurred', 500);
  }
}

