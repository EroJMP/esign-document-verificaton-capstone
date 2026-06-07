import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

// GET /api/admin/forms/[id]/fields - Get form fields
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
    
    return NextResponse.json({ fields: fields || [] });
    
  } catch (error: any) {
    console.error('Error in GET /api/admin/forms/[id]/fields:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}

// POST /api/admin/forms/[id]/fields - Create form field
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const formId = params.id;
    const fieldData = await req.json();
    
    // Validate required fields
    const { type, x, y, width, height } = fieldData;
    
    if (!type || x === undefined || y === undefined || !width || !height) {
      return createErrorResponse('Missing required field data', 400);
    }
    
    // Create the field
    const { data: field, error: fieldError } = await supabase
      .from('form_fields')
      .insert({
        form_id: formId,
        field_type: type,
        x_position: x,
        y_position: y,
        width,
        height,
        required: fieldData.required !== false, // Default to true unless explicitly false
        label: fieldData.label || null
      })
      .select()
      .single();
    
    if (fieldError) {
      console.error('Error creating form field:', fieldError);
      console.error('Field error details:', JSON.stringify(fieldError, null, 2));
      console.error('Field data that failed:', fieldData);
      return createErrorResponse(`Failed to create form field: ${fieldError.message}`);
    }
    
    return NextResponse.json({ field }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error in POST /api/admin/forms/[id]/fields:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}