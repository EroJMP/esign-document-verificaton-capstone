import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

// DELETE /api/admin/forms/[id]/fields/delete-all - Delete all fields for a form
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const formId = params.id;
    
    // Verify the form exists
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id, title')
      .eq('id', formId)
      .single();
    
    if (formError) {
      console.error('Error fetching form:', formError);
      return createErrorResponse('Form not found', 404);
    }
    
    // Delete all fields for this form
    const { error: deleteError } = await supabase
      .from('form_fields')
      .delete()
      .eq('form_id', formId);
    
    if (deleteError) {
      console.error('Error deleting fields:', deleteError);
      return createErrorResponse('Failed to delete form fields');
    }
    
    return NextResponse.json({
      success: true,
      message: 'All form fields deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/forms/[id]/fields/delete-all:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}