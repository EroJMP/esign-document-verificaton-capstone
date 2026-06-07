import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

export async function POST(req: NextRequest) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const { title, description, fields, pdfTemplate } = await req.json();
    
    if (!title || !fields || !Array.isArray(fields)) {
      return createErrorResponse('Title and fields are required', 400);
    }
    
    // Use the create_form_with_fields RPC function
    const { data: formId, error: createError } = await supabase
      .rpc('create_form_with_fields', {
        p_title: title,
        p_description: description || null,
        p_pdf_template: pdfTemplate || null,
        p_available_from: null,
        p_available_until: null,
        p_fields: fields
      });
    
    if (createError) {
      console.error('Error creating form with fields:', createError);
      return createErrorResponse('Failed to create form');
    }
    
    // Fetch the created form
    const { data: form, error: fetchError } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching created form:', fetchError);
      return createErrorResponse('Form created but failed to fetch details');
    }
    
    return NextResponse.json({
      success: true,
      form,
      form_id: formId
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error in POST /api/admin/forms/direct-create:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}