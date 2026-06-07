import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationOTP, generateRegistrationOTP } from '@/lib/otp-service';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      studentId, 
      collegeDepartment, 
      course, 
      yearSection,
      otpCode,
      parentIdPictureUrl,
      step
    } = await req.json();
    
    // Step 1: Validate registration data and generate OTP
    if (step === 'validate') {
      // Validate input
      if (!email || !password || !firstName || !lastName || !studentId || !collegeDepartment || !course || !yearSection || !parentIdPictureUrl) {
        return NextResponse.json({ 
          error: 'All fields including parent ID picture are required' 
        }, { status: 400 });
      }

      // Validate email domain
      if (!email.endsWith('@plpasig.edu.ph')) {
        return NextResponse.json({ 
          error: 'Email must end with @plpasig.edu.ph' 
        }, { status: 400 });
      }

      // Validate student ID format
      if (!/^[A-Z0-9-]+$/.test(studentId) || studentId.length < 5 || studentId.length > 20) {
        return NextResponse.json({ 
          error: 'Student ID must be 5-20 characters long and contain only letters, numbers, and hyphens' 
        }, { status: 400 });
      }

      // Validate password length
      if (password.length < 6) {
        return NextResponse.json({ 
          error: 'Password must be at least 6 characters long' 
        }, { status: 400 });
      }

      // Validate year section format: (1st|2nd|3rd|4th) Year - [A-Z] (single alphabet character only)
      const yearSectionPattern = /^(1st|2nd|3rd|4th) Year - [A-Z]$/;
      if (!yearSectionPattern.test(yearSection.trim())) {
        return NextResponse.json({ 
          error: 'Invalid Format (e.g., 4th Year - A)' 
        }, { status: 400 });
      }

      // Check if student ID already exists
      const supabase = await createClient();
      const { createClient: createServiceClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data: existingStudent, error: studentCheckError } = await supabaseAdmin
        .from('users')
        .select('student_id')
        .eq('student_id', studentId)
        .single();

      if (existingStudent) {
        return NextResponse.json({ 
          error: 'Student ID already exists' 
        }, { status: 400 });
      }

      // Generate and send OTP
      const otpResult = await generateRegistrationOTP(email, firstName, lastName);
      
      if (!otpResult.success) {
        return NextResponse.json({ 
          error: otpResult.error || 'Failed to send verification code'
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        step: 'otp',
        message: 'Verification code sent to your email',
        parentIdPictureUrl // Return the URL so it can be sent back in OTP step
      });
    }

    // Step 2: Verify OTP and complete registration
    if (step === 'otp') {
      // Validate input
      if (!email || !password || !firstName || !lastName || !studentId || !collegeDepartment || !course || !yearSection || !otpCode) {
        return NextResponse.json({ 
          error: 'All fields including OTP code are required' 
        }, { status: 400 });
      }

      // parentIdPictureUrl is optional in OTP step if it wasn't provided, but we'll use it if available

      // Validate year section format: (1st|2nd|3rd|4th) Year - [A-Z]
      const yearSectionPattern = /^(1st|2nd|3rd|4th) Year - [A-Z]$/;
      if (!yearSectionPattern.test(yearSection.trim())) {
        return NextResponse.json({ 
          error: 'Invalid Format (e.g., 4th Year - A)' 
        }, { status: 400 });
      }

      // Validate OTP code
      if (otpCode.length !== 6) {
        return NextResponse.json({ 
          error: 'Please enter a valid 6-digit verification code' 
        }, { status: 400 });
      }

      // Verify OTP first
      const otpResult = await verifyRegistrationOTP(email, otpCode);
      
      if (!otpResult.success) {
        return NextResponse.json({ 
          error: otpResult.error 
        }, { status: 400 });
      }
      
      // Create server client with service role for admin operations
      const supabase = await createClient();
      
      // For registration, we need to use the service role key
      // Create a service role client for user creation
      const { createClient: createServiceClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Check if student ID already exists (double check)
      const { data: existingStudent, error: studentCheckError } = await supabaseAdmin
        .from('users')
        .select('student_id')
        .eq('student_id', studentId)
        .single();

      if (existingStudent) {
        return NextResponse.json({ 
          error: 'Student ID already exists' 
        }, { status: 400 });
      }

      // Register the user with email confirmation disabled
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          student_id: studentId,
          college_department: collegeDepartment,
          course: course,
          year_section: yearSection
        }
      });
      
      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
      
      if (authData.user) {
        // Generate a placeholder password hash for the users table
        // This isn't the actual hash used by Supabase Auth but satisfies the constraint
        const placeholderHash = crypto.createHash('sha256').update(password).digest('hex');
        
        // Move parent ID picture from temp folder to user's folder if it exists
        let finalParentIdPictureUrl = parentIdPictureUrl || null;
        
        if (parentIdPictureUrl && parentIdPictureUrl.startsWith('temp/')) {
          // Move file from temp/ to user's folder
          const newFileName = `user_${authData.user.id}_parent_id_${Date.now()}.${parentIdPictureUrl.split('.').pop()}`;
          const newPath = `${authData.user.id}/${newFileName}`;
          
          // Copy file from temp location to user folder
          const { data: oldFile, error: downloadError } = await supabaseAdmin.storage
            .from('parent-id-pictures')
            .download(parentIdPictureUrl);
          
          if (oldFile && !downloadError) {
            const arrayBuffer = await oldFile.arrayBuffer();
            // Determine content type from file extension
            const fileExtension = parentIdPictureUrl.split('.').pop()?.toLowerCase();
            const contentTypeMap: { [key: string]: string } = {
              'png': 'image/png',
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'webp': 'image/webp'
            };
            const contentType = contentTypeMap[fileExtension || ''] || 'image/jpeg';
            
            const { error: moveError } = await supabaseAdmin.storage
              .from('parent-id-pictures')
              .upload(newPath, arrayBuffer, {
                contentType: contentType,
                upsert: false,
              });
            
            if (!moveError) {
              finalParentIdPictureUrl = newPath;
              
              // Delete old temp file
              await supabaseAdmin.storage
                .from('parent-id-pictures')
                .remove([parentIdPictureUrl]);
            } else {
              console.error('Error moving parent ID picture:', moveError);
              // Continue with temp path if move fails
            }
          } else {
            console.error('Error downloading parent ID picture:', downloadError);
            // Continue with temp path if download fails
          }
        }
        
        // Insert user profile using service role (bypasses RLS)
        const { error: profileError } = await supabaseAdmin
          .from('users')
          .insert({
            id: authData.user.id,
            email,
            password_hash: placeholderHash, // Add this field to satisfy the constraint
            role: 'student', // Default role is student
            first_name: firstName,
            last_name: lastName,
            student_id: studentId,
            college_department: collegeDepartment,
            course: course,
            year_section: yearSection,
            parent_id_picture_url: finalParentIdPictureUrl,
          });
        
        if (profileError) {
          return NextResponse.json({ error: profileError.message }, { status: 400 });
        }
        
        return NextResponse.json({ 
          success: true, 
          step: 'complete',
          user: authData.user,
          message: 'Registration completed successfully'
        });
      }
      
      return NextResponse.json({ error: 'Registration failed' }, { status: 400 });
    }
    
    // If no step specified, default to validate step
    return NextResponse.json({ 
      error: 'Invalid request. Please specify step parameter.' 
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}