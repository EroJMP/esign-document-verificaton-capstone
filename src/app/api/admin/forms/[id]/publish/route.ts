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
    
    // Check if form exists and has required components
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id, title, pdf_template, status')
      .eq('id', formId)
      .single();
    
    if (formError) {
      console.error('Error fetching form:', formError);
      return createErrorResponse('Form not found', 404);
    }
    
    if (!form.pdf_template) {
      return createErrorResponse('Cannot publish form without PDF template', 400);
    }
    
    // Check if form has fields
    const { count: fieldCount } = await supabase
      .from('form_fields')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', formId);
    
    if (!fieldCount || fieldCount === 0) {
      return createErrorResponse('Cannot publish form without fields', 400);
    }
    
    // Update form status to published
    const { data: updatedForm, error: updateError } = await supabase
      .from('forms')
      .update({ 
        status: 'published',
        updated_at: new Date().toISOString()
      })
      .eq('id', formId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error publishing form:', updateError);
      return createErrorResponse('Failed to publish form');
    }
    
    // Log audit trail
    await logAdminAction(
      supabase,
      user,
      AUDIT_ACTIONS.FORM_PUBLISHED,
      ENTITY_TYPES.FORM,
      formId,
      {
        form_title: form.title,
        previous_status: form.status,
        new_status: 'published',
        field_count: fieldCount
      },
      getClientIP(req)
    );
    
    return NextResponse.json({
      success: true,
      form: updatedForm,
      message: 'Form published successfully'
    });
    
  } catch (error: any) {
    console.error('Error in POST /api/admin/forms/[id]/publish:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}