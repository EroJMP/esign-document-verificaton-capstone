import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse, createErrorResponse } from '@/lib/auth-helpers';

// GET /api/student/dashboard - Get student dashboard data (forms with submission status)
export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return createUnauthorizedResponse();
    }
    
    const userId = user.id;
    
    // Step 1: Fetch all submissions for this student
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('*')
      .eq('student_id', userId);
      
    if (submissionsError) {
      console.error('Submissions fetch error:', submissionsError);
      return createErrorResponse(`Failed to fetch submissions: ${submissionsError.message}`, 500);
    }
    
    // Extract form IDs from submissions
    const submissionFormIds = (submissions || []).map((sub: any) => sub.form_id);
    
    if (submissionFormIds.length === 0) {
      // If there are no submissions, return empty forms array
      return NextResponse.json({ forms: [] });
    }
      
    // Step 2: Fetch forms with submissions
    const { data: submissionForms, error: submissionFormsError } = await supabase
      .from('forms')
      .select('*')
      .in('id', submissionFormIds);
      
    if (submissionFormsError) {
      return createErrorResponse(`Failed to fetch forms: ${submissionFormsError.message}`, 500);
    }
    
    // Step 3: Create a map for submissions by form ID
    const submissionMap = new Map<string, { id: string; status: string; submitted_at: string | null; rejection_reason: string | null }>();
    (submissions || []).forEach((submission: any) => {
      submissionMap.set(submission.form_id, {
        id: submission.id,
        status: submission.status,
        submitted_at: submission.submitted_at,
        rejection_reason: submission.rejection_reason || null
      });
    });
      
    // Step 4: Combine forms with submission status
    const formsWithStatus = (submissionForms || []).map((form: any) => {
      const submission = submissionMap.get(form.id);
      
      // Map database status to display status
      let displayStatus: 'pending' | 'submitted' | 'verified' | 'rejected' | null = null;
      if (submission) {
        if (submission.status === 'verified') {
          displayStatus = 'verified';
        } else if (submission.status === 'completed') {
          displayStatus = 'submitted';
        } else if (submission.status === 'rejected') {
          displayStatus = 'rejected';
        } else if (submission.status === 'in_progress') {
          displayStatus = 'pending';
        } else {
          displayStatus = 'pending';
        }
      }
      
      return {
        id: form.id,
        title: form.title,
        description: form.description,
        available_from: form.available_from,
        available_until: form.available_until,
        status: form.status,
        submission_status: displayStatus,
        submission_id: submission?.id || null,
        rejection_reason: submission?.rejection_reason || null,
        required_forms: []
      };
    });
      
    return NextResponse.json({ 
      forms: formsWithStatus,
      user: {
        id: user.id,
        email: user.email
      }
    });
    
  } catch (error: any) {
    console.error('Error in GET /api/student/dashboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

