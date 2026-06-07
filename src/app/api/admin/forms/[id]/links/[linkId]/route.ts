import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';
import { logAdminAction, getClientIP, AUDIT_ACTIONS, ENTITY_TYPES } from '@/lib/audit-helpers';

// GET /api/admin/forms/[id]/links/[linkId] - Get a specific access link
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; linkId: string } }
) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const { id: formId, linkId } = params;
    
    // Fetch the specific access link
    const { data: link, error: linkError } = await supabase
      .from('form_access_links')
      .select('*')
      .eq('form_id', formId)
      .eq('id', linkId)
      .single();
    
    if (linkError) {
      console.error('Error fetching access link:', linkError);
      return createErrorResponse('Access link not found', 404);
    }
    
    return NextResponse.json({ link });
    
  } catch (error: any) {
    console.error('Error in GET /api/admin/forms/[id]/links/[linkId]:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}

// PUT /api/admin/forms/[id]/links/[linkId] - Update a specific access link
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; linkId: string } }
) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const { id: formId, linkId } = params;
    const updates = await req.json();
    
    // Update the access link
    const { data: link, error: updateError } = await supabase
      .from('form_access_links')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('form_id', formId)
      .eq('id', linkId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating access link:', updateError);
      return createErrorResponse('Failed to update access link');
    }
    
    return NextResponse.json({ link });
    
  } catch (error: any) {
    console.error('Error in PUT /api/admin/forms/[id]/links/[linkId]:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}

// DELETE /api/admin/forms/[id]/links/[linkId] - Delete a specific access link
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; linkId: string } }
) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const { id: formId, linkId } = params;
    
    // Delete the access link
    const { error: deleteError } = await supabase
      .from('form_access_links')
      .delete()
      .eq('form_id', formId)
      .eq('id', linkId);
    
    if (deleteError) {
      console.error('Error deleting access link:', deleteError);
      return createErrorResponse('Failed to delete access link');
    }
    
    // Log audit trail
    await logAdminAction(
      supabase,
      user,
      AUDIT_ACTIONS.ACCESS_LINK_DELETED,
      ENTITY_TYPES.ACCESS_LINK,
      linkId,
      {
        form_id: formId,
        link_id: linkId
      },
      getClientIP(req)
    );
    
    return NextResponse.json({
      success: true,
      message: 'Access link deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/forms/[id]/links/[linkId]:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}