import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';
import { logAdminAction, getClientIP, AUDIT_ACTIONS, ENTITY_TYPES } from '@/lib/audit-helpers';

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
    
    // Check if form exists
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id, title, status')
      .eq('id', formId)
      .single();
    
    if (formError) {
      console.error('Error fetching form:', formError);
      return createErrorResponse('Form not found', 404);
    }
    
    // Update form status to inactive
    const { data: updatedForm, error: updateError } = await supabase
      .from('forms')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', formId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error unpublishing form:', updateError);
      return createErrorResponse('Failed to unpublish form');
    }
    
    // Log audit trail
    await logAdminAction(
      supabase,
      user,
      AUDIT_ACTIONS.FORM_STATUS_CHANGED,
      ENTITY_TYPES.FORM,
      formId,
      {
        form_title: form.title,
        previous_status: form.status,
        new_status: 'inactive',
        action: 'unpublish'
      },
      getClientIP(req)
    );
    
    return NextResponse.json({
      success: true,
      form: updatedForm,
      message: 'Form submissions disabled successfully'
    });
    
  } catch (error: any) {
    console.error('Error in POST /api/admin/forms/[id]/unpublish:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}