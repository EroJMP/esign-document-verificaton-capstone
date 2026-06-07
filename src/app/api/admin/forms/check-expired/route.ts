import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';
import { logAdminAction, getClientIP, AUDIT_ACTIONS, ENTITY_TYPES } from '@/lib/audit-helpers';

// GET /api/admin/forms/check-expired - Check and update expired forms
export async function GET(req: NextRequest) {
  try {
    const { supabase, user, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }

    // Get current Singapore time in the same format as stored in database
    const now = new Date();
    const singaporeTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
    // Format as YYYY-MM-DDTHH:mm:ss (without Z) to match database format
    const year = singaporeTime.getFullYear();
    const month = String(singaporeTime.getMonth() + 1).padStart(2, '0');
    const day = String(singaporeTime.getDate()).padStart(2, '0');
    const hours = String(singaporeTime.getHours()).padStart(2, '0');
    const minutes = String(singaporeTime.getMinutes()).padStart(2, '0');
    const seconds = String(singaporeTime.getSeconds()).padStart(2, '0');
    const nowISO = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    
    // Find all forms that have expired (available_until date has passed) and are not already completed/archived
    const { data: expiredForms, error: fetchError } = await supabase
      .from('forms')
      .select('id, title, available_until, status')
      .not('available_until', 'is', null)
      .lt('available_until', nowISO)
      .neq('status', 'completed')
      .neq('status', 'archived')
      .order('available_until', { ascending: true });

    if (fetchError) {
      console.error('Error fetching expired forms:', fetchError);
      return createErrorResponse('Failed to fetch expired forms');
    }

    if (!expiredForms || expiredForms.length === 0) {
      return NextResponse.json({
        message: 'No expired forms found',
        updatedForms: [],
        count: 0
      });
    }

    // Update all expired forms to 'completed' status
    const formIds = expiredForms.map(form => form.id);
    
    const { data: updatedForms, error: updateError } = await supabase
      .from('forms')
      .update({ 
        status: 'completed',
        updated_at: nowISO
      })
      .in('id', formIds)
      .select('id, title, status, available_until');

    if (updateError) {
      console.error('Error updating expired forms:', updateError);
      return createErrorResponse('Failed to update expired forms');
    }

    // Log audit trail for each updated form
    if (user) {
      for (const form of updatedForms || []) {
        await logAdminAction(
          supabase,
          user,
          AUDIT_ACTIONS.FORM_STATUS_CHANGED,
          ENTITY_TYPES.FORM,
          form.id,
          {
            form_title: form.title,
            previous_status: 'published',
            new_status: 'completed',
            reason: 'auto_completed_expired',
            available_until: form.available_until
          },
          getClientIP(req)
        );
      }
    }

    return NextResponse.json({
      message: `Successfully updated ${updatedForms?.length || 0} expired forms to completed status`,
      updatedForms: updatedForms || [],
      count: updatedForms?.length || 0,
      expiredForms: expiredForms
    });

  } catch (error: any) {
    console.error('Error in GET /api/admin/forms/check-expired:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}

// POST /api/admin/forms/check-expired - Check and update expired forms (alternative endpoint)
export async function POST(req: NextRequest) {
  try {
    const { supabase, user, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }

    // Get current timestamp in Singapore timezone to match database
    const now = new Date();
    const singaporeTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
    const nowISO = singaporeTime.toISOString();
    
    // Find all forms that have expired (available_until date has passed) and are not already completed/archived
    const { data: expiredForms, error: fetchError } = await supabase
      .from('forms')
      .select('id, title, available_until, status')
      .not('available_until', 'is', null)
      .lt('available_until', nowISO)
      .neq('status', 'completed')
      .neq('status', 'archived')
      .order('available_until', { ascending: true });

    if (fetchError) {
      console.error('Error fetching expired forms:', fetchError);
      return createErrorResponse('Failed to fetch expired forms');
    }

    if (!expiredForms || expiredForms.length === 0) {
      return NextResponse.json({
        message: 'No expired forms found',
        updatedForms: [],
        count: 0
      });
    }

    // Update all expired forms to 'completed' status
    const formIds = expiredForms.map(form => form.id);
    
    const { data: updatedForms, error: updateError } = await supabase
      .from('forms')
      .update({ 
        status: 'completed',
          updated_at: nowISO
      })
      .in('id', formIds)
      .select('id, title, status, available_until');

    if (updateError) {
      console.error('Error updating expired forms:', updateError);
      return createErrorResponse('Failed to update expired forms');
    }

    // Log audit trail for each updated form
    if (user) {
      for (const form of updatedForms || []) {
        await logAdminAction(
          supabase,
          user,
          AUDIT_ACTIONS.FORM_STATUS_CHANGED,
          ENTITY_TYPES.FORM,
          form.id,
          {
            form_title: form.title,
            previous_status: 'published',
            new_status: 'completed',
            reason: 'auto_completed_expired',
            available_until: form.available_until
          },
          getClientIP(req)
        );
      }
    }

    return NextResponse.json({
      message: `Successfully updated ${updatedForms?.length || 0} expired forms to completed status`,
      updatedForms: updatedForms || [],
      count: updatedForms?.length || 0,
      expiredForms: expiredForms
    });

  } catch (error: any) {
    console.error('Error in POST /api/admin/forms/check-expired:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}