import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';
import { logAdminAction, getClientIP, AUDIT_ACTIONS, ENTITY_TYPES } from '@/lib/audit-helpers';

// GET /api/admin/forms - List all forms
export async function GET(req: NextRequest) {
  try {
    const { supabase, user, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    // Get query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const page = parseInt(url.searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    
    // First, check for and auto-complete expired forms
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
    
    const { data: expiredForms, error: expiredError } = await supabase
      .from('forms')
      .select('id, title, available_until, status')
      .not('available_until', 'is', null)
      .lt('available_until', nowISO)
      .neq('status', 'completed')
      .neq('status', 'archived');
    
    if (expiredError) {
      console.error('Error checking expired forms:', expiredError);
    } else if (expiredForms && expiredForms.length > 0) {
      const formIds = expiredForms.map(form => form.id);
      const { error: updateError } = await supabase
        .from('forms')
        .update({ 
          status: 'completed',
          updated_at: nowISO
        })
        .in('id', formIds);
    
      if (updateError) {
        console.error('Error updating expired forms:', updateError);
      }
    }

    // Fetch forms with pagination (exclude archived forms)
    const { data: forms, error: formsError } = await supabase
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
        created_at,
        updated_at,
        status,
        users!created_by (
          first_name,
          last_name
        )
      `)
      .neq('status', 'archived')
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (formsError) {
      console.error('Error fetching forms:', formsError);
      return createErrorResponse('Failed to fetch forms');
    }
    
    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('forms')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'archived')
      .neq('status', 'completed');
    
    if (countError) {
      console.error('Error counting forms:', countError);
      return createErrorResponse('Failed to count forms');
    }
    
    return NextResponse.json({
      forms: forms || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
    
  } catch (error: unknown) {
    console.error('Error in GET /api/admin/forms:', error);
    return createErrorResponse((error as Error).message || 'An error occurred');
  }
}

// POST /api/admin/forms - Create a new form
export async function POST(req: NextRequest) {
  try {
    const { supabase, user, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const { 
      title, 
      description, 
      available_from, 
      available_until, 
      assigned_college_department,
      assigned_courses,
      assigned_students,
      openDate, 
      closeDate 
    } = await req.json();
    
    if (!title) {
      return createErrorResponse('Title is required', 400);
    }

    if (!user) {
      return createErrorResponse('User not found', 401);
    }
    
    // Handle both field name formats for compatibility
    const availableFromDate = available_from || openDate || null;
    const availableUntilDate = available_until || closeDate || null;
    
    // Create the form
    const { data: form, error: formError } = await supabase
      .from('forms')
      .insert({
        title,
        description,
        created_by: user.id,
        available_from: availableFromDate,
        available_until: availableUntilDate,
        assigned_college_department: assigned_college_department || null,
        assigned_courses: assigned_courses || null,
        assigned_students: assigned_students || null,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (formError) {
      console.error('Error creating form:', formError);
      return createErrorResponse(`Failed to create form: ${formError.message}`);
    }
    
    // Log audit trail
    await logAdminAction(
      supabase,
      user,
      AUDIT_ACTIONS.FORM_CREATED,
      ENTITY_TYPES.FORM,
      form.id,
      {
        form_title: title,
        form_description: description,
        available_from: availableFromDate,
        available_until: availableUntilDate,
        assigned_college_department: assigned_college_department,
        assigned_courses: assigned_courses,
        assigned_students: assigned_students,
        status: 'draft'
      },
      getClientIP(req)
    );
    
    return NextResponse.json({ form }, { status: 201 });
    
  } catch (error: unknown) {
    console.error('Error in POST /api/admin/forms:', error);
    return createErrorResponse((error as Error).message || 'An error occurred');
  }
}