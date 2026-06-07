import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth-helpers';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// POST /api/student/profile/parent-id - Upload/Update parent ID picture
export async function POST(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return createUnauthorizedResponse();
    }

    const formData = await req.formData();
    const file = formData.get('parentIdPicture') as File;

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

    // Use service role client for upload
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `user_${user.id}_parent_id_${timestamp}.${fileExtension}`;
    const filePath = `${user.id}/${fileName}`;

    // Delete old parent ID picture if it exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('parent_id_picture_url')
      .eq('id', user.id)
      .single();

    if (existingUser?.parent_id_picture_url) {
      // Delete old file from storage
      const oldPath = existingUser.parent_id_picture_url;
      await supabaseAdmin.storage
        .from('parent-id-pictures')
        .remove([oldPath]);
    }

    // Upload new file to Supabase storage
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

    // Update user record with new parent ID picture path
    const { error: updateError } = await supabase
      .from('users')
      .update({
        parent_id_picture_url: filePath,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update error:', updateError);
      // Try to clean up uploaded file if database update fails
      await supabaseAdmin.storage
        .from('parent-id-pictures')
        .remove([filePath]);
      
      return NextResponse.json({ 
        error: `Failed to update profile: ${updateError.message}` 
      }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('parent-id-pictures')
      .getPublicUrl(filePath);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const fileUrl = publicUrl || `${supabaseUrl}/storage/v1/object/public/parent-id-pictures/${filePath}`;

    return NextResponse.json({ 
      success: true,
      url: filePath,
      publicUrl: fileUrl,
      message: 'Parent ID picture uploaded successfully'
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to upload parent ID picture' 
    }, { status: 500 });
  }
}

