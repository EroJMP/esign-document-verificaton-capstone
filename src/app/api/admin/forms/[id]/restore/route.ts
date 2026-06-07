import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';
import { logAdminAction, getClientIP, AUDIT_ACTIONS, ENTITY_TYPES } from '@/lib/audit-helpers';

// PUT /api/admin/forms/[id]/restore - Restore an archived form
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const { id: formId } = await params;
    
    // First, verify the form exists and is archived
    const { data: existingForm, error: fetchError } = await supabase
      .from('forms')
      .select('id, title, status')
      .eq('id', formId)
      .single();
    
    if (fetchError || !existingForm) {
      return createErrorResponse('Form not found', 404);
    }
    
    if (existingForm.status !== 'archived') {
      return createErrorResponse('Form is not archived', 400);
    }
    
    // Restore the form by changing status to 'active'
    const { data: updatedForm, error: updateError } = await supabase
      .from('forms')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', formId)
      .select('id, title, status')
      .single();
    
    if (updateError) {
      console.error('Error restoring form:', updateError);
      return createErrorResponse('Failed to restore form');
    }
    
    // Log audit trail for form restoration
    if (user) {
      await logAdminAction(
        supabase,
        user,
        AUDIT_ACTIONS.FORM_STATUS_CHANGED,
        ENTITY_TYPES.FORM,
        formId,
        {
          form_title: existingForm.title,
          previous_status: 'archived',
          status: 'active',
          action: 'restored'
        },
        getClientIP(req)
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Form restored successfully',
      form: updatedForm
    });
    
  } catch (error: any) {
    console.error('Error in PUT /api/admin/forms/[id]/restore:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}
