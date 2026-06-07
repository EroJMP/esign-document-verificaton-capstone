import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

export interface RecentForm {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  created_by_name: string;
  total_verified: number;
  total_submitted: number;
  total_in_progress: number;
  total_no_submission: number;
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

    // Fetch recent forms with creator information
    const { data: forms, error: formsError } = await supabase
      .from('forms')
      .select(`
        id,
        title,
        description,
        status,
        created_at,
        users!created_by (
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (formsError) {
      console.error('Error fetching forms:', formsError);
      return createErrorResponse('Failed to fetch recent forms');
    }

    if (!forms || forms.length === 0) {
      return NextResponse.json({ forms: [] });
    }

    // Get submission statistics for each form
    const formIds = forms.map(form => form.id);
    
    // Get all submissions for these forms
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('form_id, status')
      .in('form_id', formIds);

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return createErrorResponse('Failed to fetch submission statistics');
    }

    // Get verified submissions (submissions with status = 'verified')
    const { data: verifiedSubmissions, error: verifiedError } = await supabase
      .from('submissions')
      .select('id, form_id')
      .eq('status', 'verified')
      .in('form_id', formIds);

    if (verifiedError) {
      console.error('Error fetching verified submissions:', verifiedError);
    }

    // Calculate statistics for each form
    const recentForms: RecentForm[] = forms.map(form => {
      const formSubmissions = submissions?.filter(s => s.form_id === form.id) || [];
      const formVerified = verifiedSubmissions?.filter(v => v.form_id === form.id) || [];
      
      const totalSubmitted = formSubmissions.filter(s => s.status === 'completed').length;
      const totalInProgress = formSubmissions.filter(s => s.status === 'in_progress').length;
      const totalVerified = new Set(formVerified.map(v => v.id)).size; // Unique verified submissions
      
      // For "no submission", we need to estimate based on form access or target audience
      // For now, we'll set it to 0 since we don't have access link usage data
      const totalNoSubmission = 0;

      return {
        id: form.id,
        title: form.title,
        description: form.description,
        status: form.status,
        created_at: form.created_at,
        created_by_name: form.users 
          ? `${form.users.first_name || ''} ${form.users.last_name || ''}`.trim() || 'Unknown'
          : 'Unknown',
        total_verified: totalVerified,
        total_submitted: totalSubmitted,
        total_in_progress: totalInProgress,
        total_no_submission: totalNoSubmission
      };
    });

    return NextResponse.json({ forms: recentForms });

  } catch (error: any) {
    console.error('Error fetching recent forms:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}
