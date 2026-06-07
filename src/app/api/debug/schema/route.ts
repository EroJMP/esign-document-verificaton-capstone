import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    // Get database schema information
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (tablesError) {
      console.error('Error fetching schema:', tablesError);
      return createErrorResponse('Failed to fetch schema information');
    }
    
    // Get form_fields table columns specifically
    const { data: formFieldsColumns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'form_fields')
      .order('ordinal_position');
    
    if (columnsError) {
      console.error('Error fetching form_fields columns:', columnsError);
    }
    
    return NextResponse.json({
      success: true,
      tables: tables || [],
      form_fields_columns: formFieldsColumns || [],
      user_id: user.id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Error in GET /api/debug/schema:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}