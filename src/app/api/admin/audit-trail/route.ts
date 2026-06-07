import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

// GET /api/admin/audit-trail - Get audit trail entries
export async function GET(req: NextRequest) {
  try {
    const { supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    // Get query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    const action = url.searchParams.get('action');
    const entityType = url.searchParams.get('entity_type');
    
    // Build the query - exclude submission-related entries
    let query = supabase
      .from('audit_trail')
      .select(`
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        details,
        ip_address,
        timestamp,
        users!audit_trail_user_id_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .not('action', 'like', '%submission%')
      .not('entity_type', 'eq', 'submission')
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Apply filters if provided
    if (action) {
      query = query.eq('action', action);
    }
    
    if (entityType) {
      query = query.eq('entity_type', entityType);
    }
    
    const { data: auditEntries, error: auditError } = await query;
    
    if (auditError) {
      console.error('Error fetching audit trail:', auditError);
      return createErrorResponse('Failed to fetch audit trail');
    }
    
    // Get total count for pagination - exclude submission-related entries
    let countQuery = supabase
      .from('audit_trail')
      .select('*', { count: 'exact', head: true })
      .not('action', 'like', '%submission%')
      .not('entity_type', 'eq', 'submission');
    
    if (action) {
      countQuery = countQuery.eq('action', action);
    }
    
    if (entityType) {
      countQuery = countQuery.eq('entity_type', entityType);
    }
    
    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.error('Error counting audit trail:', countError);
      return createErrorResponse('Failed to count audit trail entries');
    }
    
    // Get unique actions and entity types for filter options - exclude submission-related entries
    const { data: actions } = await supabase
      .from('audit_trail')
      .select('action')
      .not('action', 'like', '%submission%')
      .not('entity_type', 'eq', 'submission')
      .order('action');
    
    const { data: entityTypes } = await supabase
      .from('audit_trail')
      .select('entity_type')
      .not('action', 'like', '%submission%')
      .not('entity_type', 'eq', 'submission')
      .order('entity_type');
    
    // Extract unique values
    const uniqueActions = [...new Set(actions?.map(a => a.action) || [])];
    const uniqueEntityTypes = [...new Set(entityTypes?.map(e => e.entity_type) || [])];
    
    return NextResponse.json({
      auditEntries: auditEntries || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      },
      filters: {
        actions: uniqueActions,
        entityTypes: uniqueEntityTypes
      }
    });
    
  } catch (error: unknown) {
    console.error('Error in GET /api/admin/audit-trail:', error);
    return createErrorResponse((error as Error).message || 'An error occurred');
  }
}
