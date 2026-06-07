import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';
import { logAdminAction, getClientIP, AUDIT_ACTIONS, ENTITY_TYPES } from '@/lib/audit-helpers';

// GET /api/admin/forms/archived - List all archived forms
export async function GET(req: NextRequest) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    // Get query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const page = parseInt(url.searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    
    // Fetch only archived forms with pagination
    const { data: forms, error: formsError } = await supabase
      .from('forms')
      .select(`
        id,
        title,
        description,
        pdf_template,
        template_url,
        template_filename,
        created_by,
        available_from,
        available_until,
        created_at,
        updated_at,
        status,
        users!created_by (
          first_name,
          last_name
        )
      `)
      .eq('status', 'archived')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (formsError) {
      console.error('Error fetching archived forms:', formsError);
      return createErrorResponse('Failed to fetch archived forms');
    }
    
    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('forms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'archived');
    
    if (countError) {
      console.error('Error fetching archived forms count:', countError);
      return createErrorResponse('Failed to fetch archived forms count');
    }
    
    const totalPages = Math.ceil((count || 0) / limit);
    
    return NextResponse.json({
      forms: forms || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: totalPages
      }
    });
    
  } catch (error: any) {
    console.error('Error in GET /api/admin/forms/archived:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}
