import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

// GET /api/admin/forms/[id]/submissions/[submissionId]/pdf-proxy - Proxy PDF files for admin viewing
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const { id: formId, submissionId } = await Promise.resolve(params);
    
    // Create a service role client for storage operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Get the submission to find the PDF URL and verify it belongs to the form
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('submissions')
      .select('generated_pdf_url, form_id')
      .eq('id', submissionId)
      .eq('form_id', formId)
      .single();
    
    if (submissionError || !submission?.generated_pdf_url) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }
    
    // Extract the filename from the PDF URL
    const pdfUrl = submission.generated_pdf_url;
    const filename = pdfUrl.split('/').pop();
    
    if (!filename) {
      return NextResponse.json({ error: 'Invalid PDF URL' }, { status: 400 });
    }
    
    // Download the PDF from storage
    const { data: pdfData, error: downloadError } = await supabaseAdmin
      .storage
      .from('filled_pdfs')
      .download(filename);
    
    if (downloadError || !pdfData) {
      console.error('Error downloading PDF:', downloadError);
      return NextResponse.json({ error: 'Failed to download PDF' }, { status: 500 });
    }
    
    // Convert to buffer
    const pdfBuffer = await pdfData.arrayBuffer();
    
    // Return the PDF with proper headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
    
  } catch (error: any) {
    console.error('Error in PDF proxy:', error);
    return NextResponse.json({ 
      error: error.message || 'An error occurred' 
    }, { status: 500 });
  }
}

