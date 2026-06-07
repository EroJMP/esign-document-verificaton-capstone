import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('parentIdPicture') as File;
    const email = formData.get('email') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const studentId = formData.get('studentId') as string;

    if (!file) {
      return NextResponse.json({ 
        error: 'No file provided' 
      }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload PNG, JPEG, JPG, or WEBP' 
      }, { status: 400 });
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'File size must be less than 10MB' 
      }, { status: 400 });
    }

    // Use service role client for upload since user isn't authenticated yet
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate a unique filename
    // Use a temporary identifier based on email/studentId since user doesn't exist yet
    const timestamp = Date.now();
    const sanitizedStudentId = studentId.replace(/[^a-zA-Z0-9-]/g, '_');
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `temp_registration_${sanitizedStudentId}_${timestamp}.${fileExtension}`;
    const filePath = `temp/${fileName}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('parent-id-pictures')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ 
        error: `Failed to upload file: ${uploadError.message}` 
      }, { status: 500 });
    }

    // Get public URL (bucket is now public)
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('parent-id-pictures')
      .getPublicUrl(filePath);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const fileUrl = publicUrl || `${supabaseUrl}/storage/v1/object/public/parent-id-pictures/${filePath}`;

    return NextResponse.json({ 
      success: true,
      url: filePath, // Store path for later retrieval
      publicUrl: fileUrl, // Public URL for accessing the file
      message: 'Parent ID picture uploaded successfully'
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to upload parent ID picture' 
    }, { status: 500 });
  }
}

