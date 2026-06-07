import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

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
    const { description, expiration_days } = await req.json();
    
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
    
    console.log('Generating link for form:', { id: form.id, title: form.title, status: form.status, description });
    
    // Generate access link using RPC
    console.log('Calling generate_form_access_link RPC with formId:', formId, 'and description:', description);
    const { data: accessToken, error: linkError } = await supabase
      .rpc('generate_form_access_link', { 
        p_form_id: formId,
        p_description: description || null
      });
    
    console.log('RPC result:', { accessToken, linkError });
    
    if (linkError) {
      console.error('Error generating access link:', linkError);
      return createErrorResponse(`Failed to generate access link: ${linkError.message}`);
    }
    
    // Fetch the created access link record from database
    const { data: linkRecord, error: fetchError } = await supabase
      .from('form_access_links')
      .select('*')
      .eq('access_token', accessToken)
      .single();
    
    if (fetchError) {
      console.error('Error fetching created link record:', fetchError);
      return createErrorResponse('Link generated but failed to retrieve details');
    }
    
    console.log('Created link record:', linkRecord);
    
    return NextResponse.json({
      success: true,
      accessLink: linkRecord
    });
    
  } catch (error: any) {
    console.error('Error in POST /api/admin/forms/[id]/generate-link:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}