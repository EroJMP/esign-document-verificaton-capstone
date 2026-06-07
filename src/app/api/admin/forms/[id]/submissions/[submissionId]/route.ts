import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

// GET /api/admin/forms/[id]/submissions/[submissionId] - Get submission details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const { id: formId, submissionId } = await Promise.resolve(params);
    
    // Fetch the submission with related data
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select(`
        id,
        student_id,
        form_id,
        status,
        rejection_reason,
        qr_code,
        generated_pdf_url,
        created_at,
        updated_at,
        submitted_at,
        users!inner(
          id,
          email,
          first_name,
          last_name,
          student_id,
          college_department,
          course,
          year_section,
          parent_id_picture_url
        ),
        field_values(
          id,
          field_id,
          value,
          signature_url,
          verified
        )
      `)
      .eq('id', submissionId)
      .eq('form_id', formId)
      .single();
    
    if (submissionError || !submission) {
      console.error('Error fetching submission:', submissionError);
      return createErrorResponse('Submission not found', 404);
    }
    
    return NextResponse.json({
      submission
    });
    
  } catch (error: any) {
    console.error('Error in GET /api/admin/forms/[id]/submissions/[submissionId]:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}

