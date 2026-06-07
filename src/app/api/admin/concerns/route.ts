import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

// GET /api/admin/concerns - Get all concerns and suggestions
export async function GET(req: NextRequest) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    // Get query parameters for filtering
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    
    // Build query
    let query = supabase
      .from('concerns_suggestions')
      .select(`
        id,
        type,
        subject,
        message,
        status,
        admin_response,
        resolved_by,
        resolved_at,
        created_at,
        updated_at,
        users!concerns_suggestions_student_id_fkey(
          id,
          first_name,
          last_name,
          email,
          student_id
        ),
        resolved_by_user:users!concerns_suggestions_resolved_by_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    
    if (type) {
      query = query.eq('type', type);
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data: tickets, error: fetchError, count } = await query;
    
    if (fetchError) {
      console.error('Error fetching tickets:', fetchError);
      return createErrorResponse('Failed to fetch tickets', 500);
    }
    
    return NextResponse.json({
      tickets: tickets || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
    
  } catch (error: any) {
    console.error('Error in GET /api/admin/concerns:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}

