import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SignatureVerificationRequest {
  signatures: string[]; // Base64 encoded images
  user_id: string;
  signature_type: 'student' | 'parent';
}

interface SignatureVerificationResult {
  filename: string;
  is_authentic: boolean;
  confidence: number;
}

interface SignatureVerificationResponse {
  verification_id: string;
  results: SignatureVerificationResult[];
  all_authentic: boolean;
  flagged_indices: number[];
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: SignatureVerificationRequest = await req.json();
    
    // Validate request
    if (!body.signatures || !Array.isArray(body.signatures) || body.signatures.length === 0) {
      return NextResponse.json(
        { error: 'Signatures array is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (body.signatures.length > 7) {
      return NextResponse.json(
        { error: 'Maximum 7 signatures allowed' },
        { status: 400 }
      );
    }

    if (!body.signature_type || !['student', 'parent'].includes(body.signature_type)) {
      return NextResponse.json(
        { error: 'Invalid signature_type. Must be "student" or "parent"' },
        { status: 400 }
      );
    }

    // Ensure user can only verify their own signatures
    if (body.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: Can only verify your own signatures' },
        { status: 403 }
      );
    }

    // Store signatures temporarily in Supabase storage
    const tempSignatureUrls: string[] = [];
    const timestamp = Date.now();
    
    try {
      for (let i = 0; i < body.signatures.length; i++) {
        const signature = body.signatures[i];
        
        // Convert base64 to blob
        const base64Data = signature.includes(',') ? signature.split(',')[1] : signature;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }
        
        // Upload to temporary storage
        const fileName = `${user.id}/temp_verification_${timestamp}_${body.signature_type}_${i + 1}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('signatures')
          .upload(fileName, bytes, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload signature ${i + 1}: ${uploadError.message}`);
        }

        tempSignatureUrls.push(fileName);
      }

      // Call ML service for verification using FormData approach (like page.tsx)
      const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
      
      // Convert each signature to a file and verify individually
      const verificationResults = [];
      
      for (let i = 0; i < body.signatures.length; i++) {
        const signature = body.signatures[i];
        
        // Convert base64 to blob and create file
        const base64Data = signature.includes(',') ? signature.split(',')[1] : signature;
        const response = await fetch(`data:image/png;base64,${base64Data}`);
        const blob = await response.blob();
        const file = new File([blob], `signature_${i+1}.png`, { type: 'image/png' });
        
        // Use FormData approach like page.tsx
        const formData = new FormData();
        formData.append('file', file);
        
        const mlResponse = await fetch(`${mlServiceUrl}/verify-signature`, {
          method: 'POST',
          body: formData,
        });
        
        if (!mlResponse.ok) {
          const errorText = await mlResponse.text();
          throw new Error(`ML service error for signature ${i+1}: ${mlResponse.status} - ${errorText}`);
        }
        
        const mlResult = await mlResponse.json();
        verificationResults.push({
          filename: `signature_${i+1}`,
          is_authentic: mlResult.is_authentic,
          confidence: mlResult.confidence
        });
      }
      
      // Create verification response in expected format
      const verificationResult: SignatureVerificationResponse = {
        verification_id: `verification_${Date.now()}`,
        results: verificationResults,
        all_authentic: verificationResults.every(r => r.is_authentic),
        flagged_indices: verificationResults.map((r, i) => r.is_authentic ? -1 : i).filter(i => i !== -1)
      };

      // If all signatures are authentic, move them to permanent storage
      if (verificationResult.all_authentic) {
        const permanentUrls: string[] = [];
        
        for (let i = 0; i < tempSignatureUrls.length; i++) {
          const tempUrl = tempSignatureUrls[i];
          const permanentFileName = `${user.id}/${body.signature_type}_signature_${i + 1}_${timestamp}.png`;
          
          // Copy from temp to permanent location
          const { data: copyData, error: copyError } = await supabase.storage
            .from('signatures')
            .copy(tempUrl, permanentFileName);

          if (copyError) {
            console.error('Copy error:', copyError);
            // Continue with other signatures even if one fails
          } else {
            permanentUrls.push(permanentFileName);
          }
        }

        // Clean up temporary files
        for (const tempUrl of tempSignatureUrls) {
          await supabase.storage
            .from('signatures')
            .remove([tempUrl]);
        }

        // Instead of storing URLs, store the original base64 data directly in database
        // This eliminates the need for storage files entirely
        const signatureData = body.signatures; // Use original base64 signatures

        // Update or insert signatures in the database
        const { data: existingData, error: fetchError } = await supabase
          .from('user_signatures')
          .select('student_signatures, parent_signatures')
          .eq('user_id', user.id)
          .single();

        // Delete old signature files from storage if they exist
        if (existingData) {
          const oldSignatures = body.signature_type === 'student' 
            ? existingData.student_signatures || []
            : existingData.parent_signatures || [];

          if (oldSignatures.length > 0) {
            const filesToDelete: string[] = [];
            
            oldSignatures.forEach((signatureUrl: string) => {
              // Extract file path from URL
              // URL format: https://xxx.supabase.co/storage/v1/object/public/signatures/user_id/filename
              // We need to extract: user_id/filename
              console.log('Processing URL for deletion:', signatureUrl);
              
              if (signatureUrl.includes('/storage/v1/object/public/signatures/')) {
                const urlParts = signatureUrl.split('/storage/v1/object/public/signatures/');
                if (urlParts.length > 1) {
                  const filePath = urlParts[1];
                  console.log('Extracted file path:', filePath);
                  filesToDelete.push(filePath);
                }
              } else if (signatureUrl.includes('/signatures/')) {
                // Fallback for different URL format
                const urlParts = signatureUrl.split('/signatures/');
                if (urlParts.length > 1) {
                  const filePath = urlParts[1];
                  console.log('Extracted file path (fallback):', filePath);
                  filesToDelete.push(filePath);
                }
              } else {
                console.warn('Unknown URL format:', signatureUrl);
              }
            });

            if (filesToDelete.length > 0) {
              console.log('Attempting to delete files:', filesToDelete);
              const { data: deleteData, error: deleteError } = await supabase.storage
                .from('signatures')
                .remove(filesToDelete);

              if (deleteError) {
                console.error('Error deleting old signature files:', deleteError);
              } else {
                console.log('Successfully deleted old signature files:', deleteData);
              }
            } else {
              console.log('No files to delete');
            }
          }
        }

        let updateData: any = {};
        if (body.signature_type === 'student') {
          updateData.student_signatures = signatureData; // Store base64 data directly
          if (existingData) {
            updateData.parent_signatures = existingData.parent_signatures || [];
          }
        } else {
          updateData.parent_signatures = signatureData; // Store base64 data directly
          if (existingData) {
            updateData.student_signatures = existingData.student_signatures || [];
          }
        }

        if (existingData) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('user_signatures')
            .update(updateData)
            .eq('user_id', user.id);

          if (updateError) {
            console.error('Error updating signatures in database:', updateError);
          } else {
            console.log('✅ Successfully updated signatures in database');
          }
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('user_signatures')
            .insert({
              user_id: user.id,
              ...updateData
            });

          if (insertError) {
            console.error('Error inserting signatures in database:', insertError);
          } else {
            console.log('✅ Successfully inserted signatures in database');
          }
        }

        // 🗑️ CLEANUP: Delete ALL temporary files from storage since we're storing base64 in database
        console.log('🗑️ Cleaning up ALL temporary storage files...');
        if (tempSignatureUrls.length > 0) {
          const { data: cleanupData, error: cleanupError } = await supabase.storage
            .from('signatures')
            .remove(tempSignatureUrls);

          if (cleanupError) {
            console.error('⚠️ Error cleaning up temporary files (non-critical):', cleanupError);
          } else {
            console.log('✅ Successfully cleaned up temporary files:', cleanupData);
            console.log(`🗑️ Deleted ${tempSignatureUrls.length} temporary files from storage`);
          }
        }

        return NextResponse.json({
          ...verificationResult,
          signature_data: signatureData,
          message: 'All signatures verified as authentic and saved to database. Temporary storage files cleaned up.'
        });
      } else {
        // Keep temporary files for re-verification
        return NextResponse.json({
          ...verificationResult,
          temp_urls: tempSignatureUrls,
          message: 'Some signatures flagged as potentially forged. Please replace flagged signatures.'
        });
      }

    } catch (storageError) {
      // Clean up any uploaded files on error
      for (const tempUrl of tempSignatureUrls) {
        try {
          await supabase.storage
            .from('signatures')
            .remove([tempUrl]);
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      }
      throw storageError;
    }

  } catch (error) {
    console.error('Signature verification error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const tempUrls = searchParams.get('temp_urls');
    
    if (!tempUrls) {
      return NextResponse.json(
        { error: 'temp_urls parameter is required' },
        { status: 400 }
      );
    }

    const urlsArray = tempUrls.split(',');
    
    // Verify user owns these files
    for (const url of urlsArray) {
      if (!url.startsWith(`${user.id}/`)) {
        return NextResponse.json(
          { error: 'Forbidden: Can only delete your own files' },
          { status: 403 }
        );
      }
    }

    // Delete temporary files
    const { data, error } = await supabase.storage
      .from('signatures')
      .remove(urlsArray);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete temporary files' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Temporary files deleted successfully',
      deleted_files: urlsArray.length
    });

  } catch (error) {
    console.error('Delete temporary files error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

