import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

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
    
    // Get the form's PDF template
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('pdf_template')
      .eq('id', formId)
      .single();
    
    if (formError || !form?.pdf_template) {
      return createErrorResponse('PDF template not found', 404);
    }
    
    // Get the PDF file from storage
    const { data: pdfData, error: downloadError } = await supabase
      .storage
      .from('pdf-templates')
      .download(form.pdf_template);
    
    if (downloadError) {
      console.error('Error downloading PDF:', downloadError);
      return createErrorResponse('Failed to load PDF template');
    }
    
    // Return the PDF with appropriate headers
    const response = new NextResponse(pdfData);
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    return response;
    
  } catch (error: any) {
    console.error('Error in GET /api/admin/forms/[id]/pdf-proxy:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}