import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse, createErrorResponse } from '@/lib/auth-helpers';
import { generatePDFForSubmission } from '@/lib/pdf-generator';

// POST /api/student/submissions/[id]/generate-pdf - Generate a PDF for a completed submission
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return createUnauthorizedResponse();
    }
    
    const userId = user.id;
    const { id: submissionId } = await Promise.resolve(params);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - No user ID found in session' }, { status: 401 });
    }
    
    // Get the form ID from the request body
    const { formId } = await req.json();
    
    if (!formId) {
      return NextResponse.json({ error: 'Form ID is required' }, { status: 400 });
    }
    
    // Verify the submission belongs to the user
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('id, form_id, student_id, status')
      .eq('id', submissionId)
      .single();
    
    if (submissionError) {
      console.error('Error fetching submission:', submissionError);
      return createErrorResponse('Submission not found', 404);
    }
    
    // Verify that the submission belongs to the current user
    if (submission.student_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized - This submission belongs to another user' }, { status: 403 });
    }
    
    // Check if the submission is completed
    if (submission.status !== 'completed') {
      return NextResponse.json({ error: 'Cannot generate PDF for incomplete submission' }, { status: 400 });
    }
    
    // Use the shared PDF generation function
    try {
      const result = await generatePDFForSubmission(submissionId, formId, userId);
      
      return NextResponse.json({
        pdfUrl: result.pdfUrl,
        message: 'PDF generated successfully'
      });
    } catch (pdfError: any) {
      console.error('PDF generation error:', pdfError);
      return NextResponse.json({ 
        error: pdfError.message || 'Failed to generate PDF' 
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('Error in POST /api/student/submissions/[id]/generate-pdf:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
} 