import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

// POST /api/admin/forms/:id/upload-template - Upload PDF template
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    // Await the params object
    const { id } = await Promise.resolve(params);
    
    // Verify the form exists
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id, title')
      .eq('id', id)
      .single();
    
    if (formError) {
      console.error('Error fetching form:', formError);
      return createErrorResponse('Form not found', 404);
    }
    
    // Get the uploaded file from form data
    const formData = await req.formData();
    console.log('FormData entries:', Array.from(formData.entries()));
    const file = formData.get('pdf') as File;
    
    console.log('Received file:', { name: file?.name, type: file?.type, size: file?.size });
    
    if (!file) {
      console.log('No file found in formData');
      return createErrorResponse('No PDF file provided', 400);
    }
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      return createErrorResponse('File must be a PDF', 400);
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `form-${id}-template-${timestamp}.pdf`;
    
    // Upload to Supabase storage
    console.log('Uploading file to storage:', fileName);
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('pdf-templates')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    console.log('Storage upload result:', { uploadData, uploadError });
    
    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      console.error('Upload error details:', JSON.stringify(uploadError, null, 2));
      
      // Check if it's a permission error
      if (uploadError.message?.includes('row-level security policy') || 
          uploadError.message?.includes('permission') ||
          uploadError.message?.includes('policy')) {
        return createErrorResponse(`Storage permission error: ${uploadError.message}. Please check your admin role and storage policies.`);
      }
      
      return createErrorResponse(`Failed to upload PDF template: ${uploadError.message}`);
    }
    
    // Extract filename from the upload path
    const templateFilename = uploadData.path.split('/').pop() || '';
    
    // Construct the full Supabase storage URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const templateUrl = `${supabaseUrl}/storage/v1/object/pdf-templates/${templateFilename}`;
    
    // Update form with PDF template path and filename
    console.log('Updating form with PDF path:', uploadData.path, 'filename:', templateFilename, 'and full URL:', templateUrl);
    const { data: updatedForm, error: updateError } = await supabase
      .from('forms')
      .update({ 
        pdf_template: uploadData.path,
        template_url: templateUrl,
        template_filename: templateFilename,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    console.log('Form update result:', { updatedForm, updateError });
    
    if (updateError) {
      console.error('Error updating form:', updateError);
      return createErrorResponse(`Failed to update form with PDF template: ${updateError.message}`);
    }
    
    console.log('PDF upload completed successfully');
    return NextResponse.json({
      success: true,
      form: updatedForm,
      pdf_path: uploadData.path,
      template_url: uploadData.path, // Add this for frontend compatibility
      message: 'PDF template uploaded successfully'
    });
    
  } catch (error: any) {
    console.error('Error in PDF upload:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}