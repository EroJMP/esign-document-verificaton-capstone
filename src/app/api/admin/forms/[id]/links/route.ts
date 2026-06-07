import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

// GET /api/admin/forms/[id]/links - Get all access links for a form
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
    
    // Fetch access links for this form
    const { data: links, error: linksError } = await supabase
      .from('form_access_links')
      .select('*')
      .eq('form_id', formId)
      .order('created_at', { ascending: false });
    
    if (linksError) {
      console.error('Error fetching access links:', linksError);
      return createErrorResponse('Failed to fetch access links');
    }
    
    return NextResponse.json({
      links: links || []
    });
    
  } catch (error: any) {
    console.error('Error in GET /api/admin/forms/[id]/links:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}

// POST /api/admin/forms/[id]/links - Create a new access link
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const formId = params.id;
    const { expires_at, max_uses } = await req.json();
    
    // Verify form exists
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id, title, status')
      .eq('id', formId)
      .single();
    
    if (formError) {
      console.error('Error fetching form:', formError);
      return createErrorResponse('Form not found', 404);
    }
    
    console.log('Creating access link for form:', { id: form.id, title: form.title, status: form.status });
    
    // Generate access link using RPC
    const { data: linkToken, error: linkError } = await supabase
      .rpc('generate_form_access_link', { p_form_id: formId });
    
    if (linkError) {
      console.error('Error generating access link:', linkError);
      return createErrorResponse('Failed to generate access link');
    }
    
    // Create link record with additional metadata
    const { data: linkRecord, error: recordError } = await supabase
      .from('form_access_links')
      .insert({
        form_id: formId,
        access_token: linkToken,
        expires_at: expires_at || null,
        max_uses: max_uses || null,
        created_by: user.id
      })
      .select()
      .single();
    
    if (recordError) {
      console.error('Error creating link record:', recordError);
      return createErrorResponse('Failed to create link record');
    }
    
    return NextResponse.json({
      success: true,
      link: linkRecord,
      access_token: linkToken
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error in POST /api/admin/forms/[id]/links:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}