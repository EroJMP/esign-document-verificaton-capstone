import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse, createErrorResponse } from '@/lib/auth-helpers';

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
    
    // Verify user has access to this form
    const { data: submission } = await supabase
      .from('submissions')
      .select('id')
      .eq('form_id', formId)
      .eq('student_id', user.id)
      .single();
    
    if (!submission) {
      return createErrorResponse('Access denied to this form. Please contact the administration if you believe this is an error.', 403);
    }
    
    // Fetch form fields
    const { data: fields, error: fieldsError } = await supabase
      .from('form_fields')
      .select('*')
      .eq('form_id', formId)
      .order('created_at');
    
    if (fieldsError) {
      console.error('Error fetching form fields:', fieldsError);
      return createErrorResponse('Failed to fetch form fields');
    }
    
    return NextResponse.json({
      fields: fields || []
    });
    
  } catch (error: any) {
    console.error('Error in GET /api/student/forms/[id]/fields:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}