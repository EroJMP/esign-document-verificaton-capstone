import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse, createErrorResponse } from '@/lib/auth-helpers';

// GET /api/student/signatures - Get user signatures
export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return createUnauthorizedResponse();
    }
    
    const userId = user.id;
    
    // Fetch signatures from user_signatures table
    const { data, error: fetchError } = await supabase
      .from('user_signatures')
      .select('student_signatures, parent_signatures')
      .eq('user_id', userId)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // No rows returned - user has no signatures yet, this is normal
        return NextResponse.json({
          student_signatures: [],
          parent_signatures: []
        });
      } else {
        console.error('Error fetching signatures:', fetchError);
        return createErrorResponse(`Failed to load signatures: ${fetchError.message}`, 500);
      }
    }
    
    // Return signatures
    return NextResponse.json({
      student_signatures: data.student_signatures || [],
      parent_signatures: data.parent_signatures || []
    });
    
  } catch (error: any) {
    console.error('Error in GET /api/student/signatures:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/student/signatures - Save user signatures
export async function PUT(req: NextRequest) {
  try {
    // Get authenticated user
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return createUnauthorizedResponse();
    }
    
    const userId = user.id;
    
    // Parse request body
    const body = await req.json();
    const { signature_type, signatures } = body;
    
    if (!signature_type || !signatures) {
      return NextResponse.json({ 
        error: 'signature_type and signatures are required' 
      }, { status: 400 });
    }
    
    // Prepare update data
    const updateData = signature_type === 'student' 
      ? { student_signatures: signatures }
      : { parent_signatures: signatures };
    
    // First try to update existing record
    const { data: updateData_result, error: updateError } = await supabase
      .from('user_signatures')
      .update(updateData)
      .eq('user_id', userId)
      .select();
    
    if (updateError && updateError.code === 'PGRST116') {
      // No existing record, create new one
      const { error: insertError } = await supabase
        .from('user_signatures')
        .insert({
          user_id: userId,
          ...updateData
        });
      
      if (insertError) {
        console.error('Error inserting signatures:', insertError);
        return createErrorResponse(`Failed to save signatures: ${insertError.message}`, 500);
      }
    } else if (updateError) {
      console.error('Error updating signatures:', updateError);
      return createErrorResponse(`Failed to save signatures: ${updateError.message}`, 500);
    } else if (!updateData_result || updateData_result.length === 0) {
      // Update succeeded but affected 0 rows - no existing record, need to insert
      const { error: insertError } = await supabase
        .from('user_signatures')
        .insert({
          user_id: userId,
          ...updateData
        });
      
      if (insertError) {
        console.error('Error inserting signatures:', insertError);
        return createErrorResponse(`Failed to save signatures: ${insertError.message}`, 500);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Signatures saved successfully' 
    });
    
  } catch (error: any) {
    console.error('Error in PUT /api/student/signatures:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

