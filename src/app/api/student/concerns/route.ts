import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse, createErrorResponse } from '@/lib/auth-helpers';

// POST /api/student/concerns - Submit a concern or suggestion
export async function POST(req: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return createUnauthorizedResponse();
    }
    
    const body = await req.json();
    const { type, subject, message } = body;
    
    // Validate input
    if (!type || !['concern', 'suggestion'].includes(type)) {
      return createErrorResponse('Invalid type. Must be "concern" or "suggestion"', 400);
    }
    
    if (!subject || subject.trim().length === 0) {
      return createErrorResponse('Subject is required', 400);
    }
    
    if (!message || message.trim().length === 0) {
      return createErrorResponse('Message is required', 400);
    }
    
    if (subject.length > 255) {
      return createErrorResponse('Subject must be 255 characters or less', 400);
    }
    
    // Insert the ticket
    const { data: ticket, error: insertError } = await supabase
      .from('concerns_suggestions')
      .insert({
        student_id: user.id,
        type,
        subject: subject.trim(),
        message: message.trim(),
        status: 'open'
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error creating ticket:', insertError);
      return createErrorResponse('Failed to submit ticket', 500);
    }
    
    return NextResponse.json({
      success: true,
      ticket
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error in POST /api/student/concerns:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}

