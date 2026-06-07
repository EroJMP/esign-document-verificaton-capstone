import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse, createErrorResponse } from '@/lib/auth-helpers';

// GET /api/student/submissions/[id]/values - Get field values for a submission
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return createUnauthorizedResponse();
    }
    
    const userId = user.id;
    const { id: submissionId } = await Promise.resolve(params);
    
    if (!userId) {
      return createErrorResponse('No user ID found', 401);
    }
    
    // Verify the submission belongs to the user
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('id, form_id, student_id')
      .eq('id', submissionId)
      .eq('student_id', userId)
      .single();
    
    if (submissionError) {
      console.error('Error fetching submission:', submissionError);
      return createErrorResponse('Submission not found', 404);
    }
    
    // Get field values for this submission
    const { data: fieldValues, error: valuesError } = await supabase
      .from('field_values')
      .select(`
        id,
        field_id,
        value,
        signature_url,
        verified,
        created_at,
        updated_at
      `)
      .eq('submission_id', submissionId)
      .order('created_at');
    
    if (valuesError) {
      console.error('Error fetching field values:', valuesError);
      return createErrorResponse('Failed to fetch field values');
    }
    
    return NextResponse.json({
      submission_id: submissionId,
      fieldValues: fieldValues || []
    });
    
  } catch (error: any) {
    console.error('Error in GET /api/student/submissions/[id]/values:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}

// PUT /api/student/submissions/[id]/values - Update field values for a submission
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return createUnauthorizedResponse();
    }
    
    const userId = user.id;
    const { id: submissionId } = await Promise.resolve(params);
    const { fieldValues } = await req.json();
    
    if (!fieldValues || !Array.isArray(fieldValues)) {
      return createErrorResponse('Field values array is required', 400);
    }
    
    // Verify the submission belongs to the user
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('id, form_id, student_id, status')
      .eq('id', submissionId)
      .eq('student_id', userId)
      .single();
    
    if (submissionError) {
      console.error('Error fetching submission:', submissionError);
      return createErrorResponse('Submission not found', 404);
    }
    
    if (submission.status === 'completed') {
      return createErrorResponse('Cannot update completed submission', 400);
    }
    
    // First, get existing field values to check which ones need to be updated vs inserted
    const { data: existingValues, error: existingError } = await supabase
      .from('field_values')
      .select('id, field_id')
      .eq('submission_id', submissionId);
    
    if (existingError) {
      console.error('Error fetching existing field values:', existingError);
      return createErrorResponse('Failed to fetch existing field values');
    }
    
    // Create a map of field_id to existing value ID
    const existingValueMap = new Map();
    existingValues?.forEach(value => {
      existingValueMap.set(value.field_id, value.id);
    });
    
    // Process field values one by one to handle insert/update properly
    const updates = [];
    for (const fieldValue of fieldValues) {
      const { field_id, value, signature_url } = fieldValue;
      
      if (existingValueMap.has(field_id)) {
        // Update existing field value
        const { data: updatedValue, error: updateError } = await supabase
          .from('field_values')
          .update({
            value: value || null,
            signature_url: signature_url || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingValueMap.get(field_id))
          .select()
          .single();
        
        if (updateError) {
          console.error('Error updating field value:', updateError);
          return createErrorResponse(`Failed to update field value: ${updateError.message}`);
        }
        updates.push(updatedValue);
      } else {
        // Insert new field value
        const { data: insertedValue, error: insertError } = await supabase
          .from('field_values')
          .insert({
            submission_id: submissionId,
            field_id,
            value: value || null,
            signature_url: signature_url || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Error inserting field value:', insertError);
          return createErrorResponse(`Failed to insert field value: ${insertError.message}`);
        }
        updates.push(insertedValue);
      }
    }
    
    // Update submission timestamp
    await supabase
      .from('submissions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', submissionId);
    
    return NextResponse.json({
      success: true,
      updated_values: updates
    });
    
  } catch (error: any) {
    console.error('Error in PUT /api/student/submissions/[id]/values:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}