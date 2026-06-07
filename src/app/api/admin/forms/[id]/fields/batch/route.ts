import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

// POST /api/admin/forms/:id/fields/batch - Create multiple fields at once
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Fields batch API called with params:', params);
    
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    // Get the form ID
    const { id } = await Promise.resolve(params);
    console.log('Form ID:', id);
    
    const { fields } = await req.json();
    
    if (!fields || !Array.isArray(fields)) {
      return createErrorResponse('Fields array is required', 400);
    }
    
    console.log('Received fields for batch creation:', fields);
    
    // Verify the form exists and user has access
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id, title')
      .eq('id', id)
      .single();
    
    if (formError) {
      console.error('Error fetching form:', formError);
      return createErrorResponse('Form not found', 404);
    }
    
    console.log('Form found:', form);
    
    // Delete existing fields for this form
    const { error: deleteError } = await supabase
      .from('form_fields')
      .delete()
      .eq('form_id', id);
    
    if (deleteError) {
      console.error('Error deleting existing fields:', deleteError);
      return createErrorResponse('Failed to clear existing fields');
    }
    
    console.log('Existing fields deleted');
    
    // Insert new fields
    const fieldsToInsert = fields.map(field => ({
      form_id: id,
      field_type: field.type,
      x_position: field.x,
      y_position: field.y,
      width: field.width,
      height: field.height,
      required: field.required !== false, // Default to true unless explicitly false
      label: field.label || null
    }));
    
    console.log('Fields to insert:', fieldsToInsert);
    
    const { data: insertedFields, error: insertError } = await supabase
      .from('form_fields')
      .insert(fieldsToInsert)
      .select();
    
    if (insertError) {
      console.error('Error inserting fields:', insertError);
      console.error('Insert error details:', JSON.stringify(insertError, null, 2));
      console.error('Fields that failed to insert:', fieldsToInsert);
      return createErrorResponse(`Failed to create fields: ${insertError.message}`);
    }
    
    console.log('Fields inserted successfully:', insertedFields);
    
    return NextResponse.json({
      success: true,
      fields: insertedFields,
      count: insertedFields?.length || 0
    });
    
  } catch (error: any) {
    console.error('Error in batch fields creation:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}