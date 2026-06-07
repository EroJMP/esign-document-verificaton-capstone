import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';
import { logAdminAction, getClientIP, AUDIT_ACTIONS, ENTITY_TYPES } from '@/lib/audit-helpers';

// GET /api/admin/forms/[id] - Get a specific form
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const formId = params.id;
    
    // Fetch the form with all details
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select(`
        id,
        title,
        description,
        pdf_template,
        template_url,
        template_filename,
        created_by,
        available_from,
        available_until,
        assigned_college_department,
        assigned_courses,
        assigned_students,
        created_at,
        updated_at,
        status,
        users!created_by (
          first_name,
          last_name
        )
      `)
      .eq('id', formId)
      .single();
    
    if (formError) {
      console.error('Error fetching form:', formError);
      return createErrorResponse('Form not found', 404);
    }
    
    // Fetch form fields
    const { data: fields, error: fieldsError } = await supabase
      .from('form_fields')
      .select('*')
      .eq('form_id', formId)
      .order('created_at');
    
    if (fieldsError) {
      console.error('Error fetching form fields:', fieldsError);
      return createErrorResponse('Failed to fetch form fields');
    }
    
    console.log('Fetched form fields:', fields);
    
    // Get submission count
    const { count: submissionCount } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', formId);
    
    // Fetch access links
    const { data: accessLinks, error: linksError } = await supabase
      .from('form_access_links')
      .select('*')
      .eq('form_id', formId)
      .order('created_at', { ascending: false });
    
    if (linksError) {
      console.error('Error fetching access links:', linksError);
      // Don't fail the entire request if links can't be fetched
    }
    
    return NextResponse.json({
      form: {
        ...form,
        form_fields: fields || [],
        submission_count: submissionCount || 0
      },
      accessLinks: accessLinks || []
    });
    
  } catch (error: any) {
    console.error('Error in GET /api/admin/forms/[id]:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}

// PUT /api/admin/forms/[id] - Update a form
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const formId = params.id;
    const updates = await req.json();
    
    // Remove fields from updates as they should be handled separately
    const { fields, ...formUpdates } = updates;
    
    // Get the current form status BEFORE updating to compare
    const { data: currentForm } = await supabase
      .from('forms')
      .select('status, title, available_until')
      .eq('id', formId)
      .single();
    
    // Check if the form status should be automatically updated based on available_until date
    let finalUpdates = { ...formUpdates };
    
    // Check if we should auto-complete based on available_until
    const now = new Date();
    const availableUntilDate = formUpdates.available_until 
      ? new Date(formUpdates.available_until) 
      : (currentForm?.available_until ? new Date(currentForm.available_until) : null);
    
    // Auto-complete if available_until has passed
    if (availableUntilDate && 
        availableUntilDate < now && 
        currentForm?.status && 
        !['completed', 'archived'].includes(currentForm.status) &&
        !finalUpdates.status) { // Only auto-set if status isn't explicitly being changed
      finalUpdates.status = 'completed';
      console.log(`Auto-marking form ${formId} as completed due to expired available_until date`);
    }
    
    // If user is explicitly updating available_until
    if (formUpdates.available_until) {
      const newAvailableUntilDate = new Date(formUpdates.available_until);
      
      // If the new available_until date has passed and the form is not already completed/archived
      if (newAvailableUntilDate < now && 
          currentForm?.status && 
          !['completed', 'archived'].includes(currentForm.status) &&
          !finalUpdates.status) {
        finalUpdates.status = 'completed';
        console.log(`Auto-marking form ${formId} as completed due to expired available_until date`);
      }
      // If the available_until date is in the future and the form is currently completed (not archived)
      else if (newAvailableUntilDate > now && 
               currentForm?.status === 'completed' &&
               !finalUpdates.status) {
        finalUpdates.status = 'published'; // Reactivate the form
        console.log(`Auto-reactivating form ${formId} as published due to future available_until date`);
      }
    }
    
    // Update the form
    const { data: form, error: formError } = await supabase
      .from('forms')
      .update({
        ...finalUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', formId)
      .select()
      .single();
    
    if (formError) {
      console.error('Error updating form:', formError);
      return createErrorResponse('Failed to update form');
    }
    
    // Log audit trail
    if (user) {
      // Determine the appropriate audit action based on what was updated
      let auditAction: string = AUDIT_ACTIONS.FORM_UPDATED;
      
      // Only log status-specific actions if status is actually being changed
      if (finalUpdates.status && currentForm && finalUpdates.status !== currentForm.status) {
        if (finalUpdates.status === 'archived') {
          auditAction = AUDIT_ACTIONS.FORM_ARCHIVED;
        } else if (finalUpdates.status === 'published') {
          auditAction = AUDIT_ACTIONS.FORM_PUBLISHED;
        } else if (finalUpdates.status === 'completed' && formUpdates.available_until) {
          auditAction = AUDIT_ACTIONS.FORM_STATUS_CHANGED;
        } else {
          auditAction = AUDIT_ACTIONS.FORM_STATUS_CHANGED;
        }
      }

      await logAdminAction(
        supabase,
        user,
        auditAction,
        ENTITY_TYPES.FORM,
        formId,
        {
          updated_fields: Object.keys(finalUpdates),
          form_title: finalUpdates.title || currentForm?.title || 'unchanged',
          form_description: finalUpdates.description || 'unchanged',
          status: finalUpdates.status || 'unchanged',
          previous_status: currentForm?.status || 'unknown',
          available_from: finalUpdates.available_from || 'unchanged',
          available_until: finalUpdates.available_until || 'unchanged',
          auto_completed: finalUpdates.status === 'completed' && formUpdates.available_until ? true : false
        },
        getClientIP(req)
      );
    }
    
    return NextResponse.json({ form });
    
  } catch (error: any) {
    console.error('Error in PUT /api/admin/forms/[id]:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}

// DELETE /api/admin/forms/[id] - Delete a form
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const formId = params.id;
    
    // Get form title before deletion for audit trail
    const { data: formToDelete } = await supabase
      .from('forms')
      .select('title')
      .eq('id', formId)
      .single();
    
    // Delete the form (cascade delete will handle related submissions)
    // With CASCADE DELETE configured, all related submissions will be automatically deleted
    const { error: deleteError } = await supabase
      .from('forms')
      .delete()
      .eq('id', formId);
    
    if (deleteError) {
      console.error('Error deleting form:', deleteError);
      return createErrorResponse('Failed to delete form');
    }
    
    // Log audit trail for deletion
    if (user) {
      await logAdminAction(
        supabase,
        user,
        AUDIT_ACTIONS.FORM_DELETED,
        ENTITY_TYPES.FORM,
        formId,
        {
          form_title: formToDelete?.title || 'Unknown Form'
        },
        getClientIP(req)
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Form and all related submissions deleted successfully' 
    });
    
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/forms/[id]:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}