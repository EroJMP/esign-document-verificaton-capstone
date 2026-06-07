import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

export interface RecentSubmission {
  id: string;
  submission_id: string;
  form_id: string;
  form_title: string;
  student_name: string;
  student_email: string;
  submitted_at: string;
  timestamp: string;
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }

    // Get query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Fetch recent submit_form actions from audit_trail
    const { data: auditEntries, error: auditError } = await supabase
      .from('audit_trail')
      .select(`
        id,
        entity_id,
        timestamp,
        details,
        users!audit_trail_user_id_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .eq('action', 'submit_form')
      .eq('entity_type', 'submission')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (auditError) {
      console.error('Error fetching audit entries:', auditError);
      return createErrorResponse('Failed to fetch recent submissions');
    }

    if (!auditEntries || auditEntries.length === 0) {
      return NextResponse.json({ submissions: [] });
    }

    // Get submission and form details for each audit entry
    const submissionIds = auditEntries.map(entry => entry.entity_id).filter(Boolean);
    
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select(`
        id,
        form_id,
        submitted_at,
        forms!inner (
          id,
          title
        )
      `)
      .in('id', submissionIds);

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return createErrorResponse('Failed to fetch submission details');
    }

    // Combine audit entries with submission details
    const recentSubmissions: RecentSubmission[] = auditEntries
      .map(entry => {
        const submission = submissions?.find(s => s.id === entry.entity_id);
        if (!submission || !entry.users) return null;

        return {
          id: entry.id,
          submission_id: entry.entity_id!,
          form_id: submission.form_id,
          form_title: submission.forms.title,
          student_name: `${entry.users.first_name || ''} ${entry.users.last_name || ''}`.trim() || 'Unknown',
          student_email: entry.users.email,
          submitted_at: submission.submitted_at || entry.timestamp,
          timestamp: entry.timestamp
        };
      })
      .filter((item): item is RecentSubmission => item !== null);

    return NextResponse.json({ submissions: recentSubmissions });

  } catch (error: any) {
    console.error('Error fetching recent submissions:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}
