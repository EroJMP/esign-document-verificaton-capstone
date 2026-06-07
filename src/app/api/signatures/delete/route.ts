import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth-helpers';

interface DeleteSignaturesRequest {
  signature_type: 'student' | 'parent';
}

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return createUnauthorizedResponse();
    }

    const body: DeleteSignaturesRequest = await req.json();
    
    // Validate request
    if (!body.signature_type || !['student', 'parent'].includes(body.signature_type)) {
      return NextResponse.json(
        { error: 'Invalid signature_type. Must be "student" or "parent"' },
        { status: 400 }
    );
    }

    // Get current signatures from database
    const { data: existingData, error: fetchError } = await supabase
      .from('user_signatures')
      .select('student_signatures, parent_signatures')
      .eq('user_id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing signatures:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch existing signatures' },
        { status: 500 }
      );
    }

    if (existingData) {
      const signaturesToDelete = body.signature_type === 'student' 
        ? existingData.student_signatures || []
        : existingData.parent_signatures || [];

      console.log(`Found ${signaturesToDelete.length} signatures to delete for user ${user.id}, type: ${body.signature_type}`);
      
      // Since we're now storing base64 data directly in database, 
      // no storage cleanup is needed - just update the database

      // Update database - clear the signatures
      const updateData = body.signature_type === 'student' 
        ? { 
            student_signatures: [],
            parent_signatures: existingData.parent_signatures || []
          }
        : { 
            parent_signatures: [],
            student_signatures: existingData.student_signatures || []
          };

      const { error: updateError } = await supabase
        .from('user_signatures')
        .update(updateData)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating database:', updateError);
        return NextResponse.json(
          { error: 'Failed to update database' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: `${body.signature_type} signatures deleted successfully`,
        deleted_count: signaturesToDelete.length
      });
    } else {
      // No existing data, nothing to delete
      return NextResponse.json({
        message: 'No signatures found to delete',
        deleted_count: 0
      });
    }

  } catch (error) {
    console.error('Delete signatures error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
