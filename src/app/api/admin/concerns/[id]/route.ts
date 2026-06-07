import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

// PATCH /api/admin/concerns/[id] - Update ticket status and add admin response
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const { id } = await Promise.resolve(params);
    const body = await req.json();
    const { status, admin_response } = body;
    
    // Validate status
    if (status && !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return createErrorResponse('Invalid status', 400);
    }
    
    // Build update object
    const updateData: any = {};
    
    if (status) {
      updateData.status = status;
      
      // If resolving, set resolved_by and resolved_at
      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_by = user.id;
        updateData.resolved_at = new Date().toISOString();
      }
    }
    
    if (admin_response !== undefined) {
      updateData.admin_response = admin_response?.trim() || null;
    }
    
    updateData.updated_at = new Date().toISOString();
    
    // Update the ticket
    const { data: ticket, error: updateError } = await supabase
      .from('concerns_suggestions')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        type,
        subject,
        message,
        status,
        admin_response,
        resolved_by,
        resolved_at,
        created_at,
        updated_at,
        users!concerns_suggestions_student_id_fkey(
          id,
          first_name,
          last_name,
          email,
          student_id
        ),
        resolved_by_user:users!concerns_suggestions_resolved_by_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .single();
    
    if (updateError) {
      console.error('Error updating ticket:', updateError);
      return createErrorResponse('Failed to update ticket', 500);
    }
    
    if (!ticket) {
      return createErrorResponse('Ticket not found', 404);
    }
    
    return NextResponse.json({
      success: true,
      ticket
    });
    
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/concerns/[id]:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}

