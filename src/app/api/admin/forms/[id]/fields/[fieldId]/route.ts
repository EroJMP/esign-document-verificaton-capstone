import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

// GET /api/admin/forms/[id]/fields/[fieldId] - Get a specific field
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; fieldId: string } }
) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const { id: formId, fieldId } = params;
    
    // Fetch the specific field
    const { data: field, error: fieldError } = await supabase
      .from('form_fields')
      .select('*')
      .eq('form_id', formId)
      .eq('id', fieldId)
      .single();
    
    if (fieldError) {
      console.error('Error fetching field:', fieldError);
      return createErrorResponse('Field not found', 404);
    }
    
    return NextResponse.json({ field });
    
  } catch (error: any) {
    console.error('Error in GET /api/admin/forms/[id]/fields/[fieldId]:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}

// PUT /api/admin/forms/[id]/fields/[fieldId] - Update a specific field
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; fieldId: string } }
) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const { id: formId, fieldId } = params;
    const updates = await req.json();
    
    // Update the field
    const { data: field, error: updateError } = await supabase
      .from('form_fields')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('form_id', formId)
      .eq('id', fieldId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating field:', updateError);
      return createErrorResponse('Failed to update field');
    }
    
    return NextResponse.json({ field });
    
  } catch (error: any) {
    console.error('Error in PUT /api/admin/forms/[id]/fields/[fieldId]:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}

// DELETE /api/admin/forms/[id]/fields/[fieldId] - Delete a specific field
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; fieldId: string } }
) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const { id: formId, fieldId } = params;
    
    // Delete the field
    const { error: deleteError } = await supabase
      .from('form_fields')
      .delete()
      .eq('form_id', formId)
      .eq('id', fieldId);
    
    if (deleteError) {
      console.error('Error deleting field:', deleteError);
      return createErrorResponse('Failed to delete field');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Field deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/forms/[id]/fields/[fieldId]:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}