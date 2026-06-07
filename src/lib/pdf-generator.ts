import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { PDFDocument as PDFLibDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

// Helper function to generate QR code as base64 PNG
async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 200,
      margin: 1,
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

// Helper function to convert base64 image data to a format usable by pdf-lib
async function embedBase64Image(pdfDoc: any, base64Data: string) {
  try {
    const imageDataMatch = base64Data.match(/^data:image\/(png|jpeg|jpg|gif);base64,(.*)$/);
    
    if (!imageDataMatch) {
      console.error('Invalid base64 image data format');
      return null;
    }
    
    const [, imageFormat, imageData] = imageDataMatch;
    const imageBytes = Buffer.from(imageData, 'base64');
    
    let embeddedImage;
    
    if (imageFormat === 'png') {
      embeddedImage = await pdfDoc.embedPng(imageBytes);
    } else if (imageFormat === 'jpg' || imageFormat === 'jpeg') {
      embeddedImage = await pdfDoc.embedJpg(imageBytes);
    } else {
      console.error('Unsupported image format:', imageFormat);
      return null;
    }
    
    return embeddedImage;
  } catch (error) {
    console.error('Error embedding image:', error);
    return null;
  }
}

// Helper function to calculate optimal font size that fits within field dimensions
function calculateOptimalFontSize(text: string, fieldWidth: number, fieldHeight: number, maxFontSize: number = 12): number {
  const avgCharWidth = 0.6;
  const lineHeight = 1.2;
  
  const maxCharsPerLine = Math.floor(fieldWidth / (maxFontSize * avgCharWidth));
  const totalLines = Math.ceil(text.length / maxCharsPerLine);
  const maxFontSizeForHeight = fieldHeight / (totalLines * lineHeight);
  const maxFontSizeForWidth = (fieldWidth / (text.length * avgCharWidth));
  
  const optimalSize = Math.min(maxFontSize, maxFontSizeForHeight, maxFontSizeForWidth);
  
  return Math.max(6, Math.min(maxFontSize, optimalSize));
}

// Helper function to break text into lines that fit within field width
function breakTextIntoLines(text: string, fieldWidth: number, fontSize: number): string[] {
  const avgCharWidth = fontSize * 0.6;
  const maxCharsPerLine = Math.floor(fieldWidth / avgCharWidth);
  
  if (text.length <= maxCharsPerLine) {
    return [text];
  }
  
  const lines: string[] = [];
  let currentLine = '';
  const words = text.split(' ');
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        lines.push(word.substring(0, maxCharsPerLine));
        currentLine = word.substring(maxCharsPerLine);
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

export async function generatePDFForSubmission(submissionId: string, formId: string, userId: string) {
  try {
    // Create service role client for storage operations
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

    // Get submission details
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('submissions')
      .select('id, form_id, student_id, status, created_at, submitted_at')
      .eq('id', submissionId)
      .single();

    if (submissionError) {
      throw new Error(`Error fetching submission: ${submissionError.message}`);
    }

    // Fetch student audit trail for this submission
    const { data: studentAuditTrail, error: auditError } = await supabaseAdmin
      .from('student_audit_trail')
      .select('id, action, timestamp, field_label, details, ip_address')
      .eq('submission_id', submissionId)
      .order('timestamp', { ascending: true });

    if (auditError) {
      console.error('Error fetching student audit trail:', auditError);
      // Continue without audit trail if there's an error
    }

    // Get student data
    const { data: studentData, error: studentError } = await supabaseAdmin
      .from('users')
      .select('first_name, last_name, student_id, email, college_department, course, year_section')
      .eq('id', userId)
      .single();

    if (studentError) {
      throw new Error(`Error fetching student data: ${studentError.message}`);
    }

    // Get form details
    const { data: form, error: formError } = await supabaseAdmin
      .from('forms')
      .select('id, title, template_url, template_filename')
      .eq('id', formId)
      .single();

    if (formError) {
      throw new Error(`Error fetching form: ${formError.message}`);
    }

    // Get form fields
    const { data: formFields, error: fieldsError } = await supabaseAdmin
      .from('form_fields')
      .select('*')
      .eq('form_id', formId)
      .order('page', { ascending: true });

    if (fieldsError) {
      throw new Error(`Error fetching form fields: ${fieldsError.message}`);
    }

    // Get field values
    const { data: fieldValues, error: valuesError } = await supabaseAdmin
      .from('field_values')
      .select('field_id, value')
      .eq('submission_id', submissionId);

    if (valuesError) {
      throw new Error(`Error fetching field values: ${valuesError.message}`);
    }

    // Download template PDF
    const templateFilename = form.template_filename || form.template_url.split('/').pop();
    const { data: templatePdfData, error: templateError } = await supabaseAdmin
      .storage
      .from('pdf-templates')
      .download(templateFilename);

    if (templateError || !templatePdfData) {
      throw new Error(`Error downloading template PDF: ${templateError?.message}`);
    }

    // Load the template PDF
    const templateBuffer = await templatePdfData.arrayBuffer();
    const pdfDoc = await PDFLibDocument.load(templateBuffer);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width: pageWidth, height: pageHeight } = firstPage.getSize();

    // Embed fonts early for use throughout the document
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Add field values to the PDF
    let fieldsAdded = 0;
    const fieldValueMap = new Map();
    fieldValues.forEach(fv => {
      fieldValueMap.set(fv.field_id, fv.value);
    });

    // Process field values
    for (const fieldValue of fieldValues) {
      const field = formFields.find(f => f.id === fieldValue.field_id);
      if (!field || !field.x_position || !field.y_position) continue;

      try {
        const x = field.x_position;
        const y = pageHeight - field.y_position; // Convert to PDF coordinate system
        const fieldWidth = field.width || 200;
        const fieldHeight = field.height || 30;
        const maxFontSize = 12;

        const optimalFontSize = (typeof fieldValue.value === 'string' && fieldValue.value.startsWith('data:image')) || field.field_type === 'signature' 
          ? maxFontSize 
          : calculateOptimalFontSize(String(fieldValue.value || ''), fieldWidth, fieldHeight, maxFontSize);

        // Place the field value on the PDF
        if (field.field_type === 'checkbox') {
          // Handle checkbox fields - only show check icon if checked
          // Handle various possible checkbox value formats
          const isChecked = fieldValue.value === true || 
                           fieldValue.value === 'true' || 
                           fieldValue.value === '1' ||
                           (typeof fieldValue.value === 'string' && fieldValue.value.toLowerCase() === 'true');
          
          if (isChecked) {
            // Use simple X character to avoid encoding issues
            firstPage.drawText('X', {
              x: x + 5, // Center horizontally in 25px field
              y: y - fieldHeight + 4, // Lower the X position for better centering
              size: 8, // Even smaller size to fit perfectly in 25x25px field
              color: rgb(0, 0, 0), // Black color
              font: regularFont
            });
          }
          // If not checked, don't draw anything (as per requirements)
        } else if ((typeof fieldValue.value === 'string' && fieldValue.value.startsWith('data:image')) || field.field_type === 'signature') {
          // Handle signature/image fields
          if (typeof fieldValue.value === 'string' && fieldValue.value.startsWith('data:image')) {
            try {
              const image = await embedBase64Image(pdfDoc, fieldValue.value);
              if (image) {
                const imgWidth = Math.min(fieldWidth, image.width);
                const imgHeight = Math.min(fieldHeight, image.height);
                
                firstPage.drawImage(image, {
                  x,
                  y: y - fieldHeight + (fieldHeight - imgHeight) / 2,
                  width: imgWidth,
                  height: imgHeight
                });
              }
            } catch (error) {
              console.error('Error embedding signature:', error);
            }
          } else {
            firstPage.drawText('[Signature]', { 
              x, 
              y: y - fieldHeight/2, 
              size: optimalFontSize, 
              color: rgb(0, 0, 0) 
            });
          }
        } else {
          // Handle text fields
          const textLines = breakTextIntoLines(fieldValue.value, fieldWidth, optimalFontSize);
          textLines.forEach((line, index) => {
            firstPage.drawText(line, {
              x: x + 2, // Small left padding
              y: y - fieldHeight + 4 + (index * optimalFontSize * 1.2), // Position at bottom of field container
              size: optimalFontSize,
              color: rgb(0, 0, 0),
              maxWidth: fieldWidth - 4
            });
          });
        }
        
        fieldsAdded++;
      } catch (error) {
        console.error(`Error placing field ${fieldValue.field_id}:`, error);
      }
    }

    // Add audit trail page with QR code
    const auditPage = pdfDoc.addPage([pageWidth, pageHeight]);
    const { width: auditPageWidth, height: auditPageHeight } = auditPage.getSize();


    // Embed bold font for headers
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Page title - centered and bold
    const titleText = 'Form Submission Audit Trail';
    const titleWidth = titleText.length * 7; // Approximate width
    const titleX = (auditPageWidth - titleWidth) / 2;
    
    auditPage.drawText(titleText, {
      x: titleX,
      y: auditPageHeight - 50,
      size: 16,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    let yPosition = auditPageHeight - 90;
    
    // Student information section
    const studentInfoY = yPosition;
    
    auditPage.drawText('Student Information', {
      x: 60,
      y: studentInfoY,
      size: 12,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    yPosition = studentInfoY - 25;
    
    const studentDetails = [
      { label: 'Name', value: `${studentData.first_name} ${studentData.last_name}` },
      { label: 'Email', value: studentData.email },
      { label: 'Student ID', value: studentData.student_id },
      { label: 'Department', value: studentData.college_department },
      { label: 'Course', value: studentData.course },
      { label: 'Year/Section', value: studentData.year_section }
    ];
    
    studentDetails.forEach((detail, index) => {
      auditPage.drawText(`${detail.label}: ${detail.value}`, {
        x: 60,
        y: yPosition,
        size: 10,
        color: rgb(0, 0, 0),
      });
      
      yPosition -= 20;
    });
    
    yPosition -= 20;
    
    // Form information section
    const formInfoY = yPosition;
    
    auditPage.drawText('Form Details', {
      x: 60,
      y: formInfoY,
      size: 12,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    yPosition = formInfoY - 25;
    
    // Format submission timestamp to user-friendly format
    const submittedTimestamp = submission.submitted_at || submission.created_at;
    
    let formattedSubmittedDate;
    if (submittedTimestamp) {
      formattedSubmittedDate = new Date(submittedTimestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else {
      formattedSubmittedDate = 'Not available';
    }
    
    
    const formDetails = [
      { label: 'Form Title', value: form.title },
      { label: 'Submission ID', value: submissionId },
      { label: 'Submitted', value: formattedSubmittedDate }
    ];
    
    formDetails.forEach((detail, index) => {
      auditPage.drawText(`${detail.label}: ${detail.value}`, {
        x: 60,
        y: yPosition,
        size: 10,
        color: rgb(0, 0, 0),
      });
      
      yPosition -= 20;
    });
    
    yPosition -= 20;
    
    // Activity log section with enhanced styling
    const activityLogY = yPosition;
    
    auditPage.drawText('Activity Log', {
      x: 60,
      y: activityLogY,
      size: 12,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    yPosition -= 30;
    
    // Table design with proper alignment
    const col1X = 60; // Same margin as other sections
    const col2X = 300;
    
    // Header text
    auditPage.drawText('Date & Time', {
      x: col1X,
      y: yPosition,
      size: 10,
      color: rgb(0, 0, 0),
    });
    
    auditPage.drawText('Action', {
      x: col2X,
      y: yPosition,
      size: 10,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= 25;
    
    // Draw table rows from student audit trail with enhanced styling
    if (studentAuditTrail && studentAuditTrail.length > 0) {
      let rowIndex = 0;
      for (const entry of studentAuditTrail) {
        if (yPosition < 150) {
          // Need more space, add ellipsis
          auditPage.drawText('...', {
            x: col1X,
            y: yPosition,
            size: 10,
            color: rgb(0.5, 0.5, 0.5),
          });
          break;
        }
        
        
        // Format timestamp - use raw database value without timezone conversion
        const timestamp = entry.timestamp;
        const dateStr = new Date(timestamp).toLocaleDateString('en-US', { 
          month: '2-digit', 
          day: '2-digit', 
          year: 'numeric' 
        });
        const timeStr = new Date(timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
        
        // Format action
        let actionText = entry.action;
        if (entry.action === 'form_opened') {
          actionText = 'Form Opened';
        } else if (entry.action === 'form_submitted') {
          actionText = 'Form Submitted';
        } else if (entry.action === 'field_filled') {
          actionText = `Field Filled: ${entry.field_label || 'Unknown Field'}`;
        }
        
        // Draw row content with proper table alignment
        auditPage.drawText(`${dateStr} ${timeStr}`, {
          x: col1X,
          y: yPosition,
          size: 9,
          color: rgb(0, 0, 0),
        });
        
        auditPage.drawText(actionText, {
          x: col2X,
          y: yPosition,
          size: 9,
          color: rgb(0, 0, 0),
        });
        
        yPosition -= 20;
        rowIndex++;
      }
    } else {
      auditPage.drawText('No audit trail entries found.', {
        x: col1X,
        y: yPosition,
        size: 9,
        color: rgb(0.5, 0.5, 0.5),
      });
      yPosition -= 20;
    }
    
    yPosition -= 20;
    
    // Enhanced QR code section in footer
    const qrCodeData = submissionId;
    const qrCodeBase64 = await generateQRCode(qrCodeData);
    const qrCodeImage = await embedBase64Image(pdfDoc, qrCodeBase64);

    if (qrCodeImage) {
      const qrSize = 80;
      const qrX = (auditPageWidth - qrSize) / 2; // Center horizontally
      const qrY = 100; // Fixed position in footer

      auditPage.drawImage(qrCodeImage, {
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
      });
    }
    

    // Generate the final PDF
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // Upload the filled PDF to storage
    const filledPdfFilename = `filled_${form.id}_${submissionId}.pdf`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('filled_pdfs')
      .upload(filledPdfFilename, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Error uploading filled PDF: ${uploadError.message}`);
    }

    // Get the public URL
    const { data: publicUrlData } = await supabaseAdmin
      .storage
      .from('filled_pdfs')
      .getPublicUrl(filledPdfFilename);

    const pdfUrl = publicUrlData.publicUrl;

    // Update the submission with the filled PDF URL
    const { error: updateError } = await supabaseAdmin
      .from('submissions')
      .update({
        generated_pdf_url: pdfUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('Error updating submission with PDF URL:', updateError);
    }

    // Cleanup student_audit_trail data to save database space
    try {
      const { data: cleanupResult, error: cleanupError } = await supabaseAdmin
        .rpc('cleanup_submission_data', {
          p_submission_id: submissionId
        });
      
      if (cleanupError) {
        console.error('Error cleaning up submission data:', cleanupError);
        // Continue anyway, cleanup is not critical
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
      // Continue anyway, cleanup is not critical
    }

    return {
      success: true,
      pdfUrl,
      pdfBuffer
    };

  } catch (error: any) {
    console.error('Error in PDF generation:', error);
    throw error;
  }
}
