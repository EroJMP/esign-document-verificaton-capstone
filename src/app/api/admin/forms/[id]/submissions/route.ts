import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const formId = params.id;
    
    // Get query parameters for pagination
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const page = parseInt(url.searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    
    // Fetch submissions for this form
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select(`
        id,
        student_id,
        status,
        qr_code,
        created_at,
        updated_at,
        submitted_at,
        users!inner(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('form_id', formId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return createErrorResponse('Failed to fetch submissions');
    }
    
    // Get total count
    const { count, error: countError } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', formId);
    
    if (countError) {
      console.error('Error counting submissions:', countError);
      return createErrorResponse('Failed to count submissions');
    }
    
    return NextResponse.json({
      submissions: submissions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
    
  } catch (error: any) {
    console.error('Error in GET /api/admin/forms/[id]/submissions:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}