import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

export interface Suggestion {
  id: string;
  type: 'form_expiring' | 'completed_forms_review' | 'archive_old_forms' | 'draft_forms' | 'inactive_forms' | 'no_submission_forms' | 'inactive_status_forms';
  title: string;
  description: string;
  action_text: string;
  action_url?: string;
  entity_id?: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }

    const suggestions: Suggestion[] = [];
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    // 1. Check for forms expiring within 24 hours
    const { data: expiringForms, error: expiringError } = await supabase
      .from('forms')
      .select('id, title, available_until')
      .eq('status', 'published')
      .gte('available_until', now.toISOString())
      .lte('available_until', tomorrow.toISOString());

    if (expiringError) {
      console.error('Error fetching expiring forms:', expiringError);
    } else if (expiringForms && expiringForms.length > 0) {
      expiringForms.forEach(form => {
        suggestions.push({
          id: `expiring_${form.id}`,
          type: 'form_expiring',
          title: 'Form Expiring Soon',
          description: `"${form.title}" expires in less than 24 hours. Consider extending the deadline.`,
          action_text: 'Edit Form',
          action_url: `/admin/forms/${form.id}`,
          entity_id: form.id,
          priority: 'high',
          created_at: now.toISOString()
        });
      });
    }

    // 2. Check for completed forms where available_until is 1-3 days ago
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const { data: recentCompletedForms, error: recentCompletedError } = await supabase
      .from('forms')
      .select('id, title, available_until')
      .eq('status', 'completed')
      .not('available_until', 'is', null)
      .lt('available_until', oneDayAgo.toISOString())
      .gte('available_until', threeDaysAgo.toISOString());

    if (recentCompletedError) {
      console.error('Error fetching recent completed forms:', recentCompletedError);
    } else if (recentCompletedForms && recentCompletedForms.length > 0) {
      suggestions.push({
        id: 'recent_completed_forms',
        type: 'completed_forms_review',
        title: 'Review Completed Forms',
        description: `${recentCompletedForms.length} form(s) completed 1-3 days ago. Review submissions and reports.`,
        action_text: 'View Reports',
        action_url: '/admin/reports',
        priority: 'medium',
        created_at: now.toISOString()
      });
    }


    // 3. Check for completed forms where available_until is 10+ days ago
    const { data: expiredCompletedForms, error: expiredCompletedError } = await supabase
      .from('forms')
      .select('id, title, available_until')
      .eq('status', 'completed')
      .not('available_until', 'is', null)
      .lt('available_until', tenDaysAgo.toISOString());

    if (expiredCompletedError) {
      console.error('Error fetching expired completed forms:', expiredCompletedError);
    } else if (expiredCompletedForms && expiredCompletedForms.length > 0) {
      // Calculate days since available_until for the first form (they should all be similar)
      const daysSinceExpiry = expiredCompletedForms.length > 0 ? 
        Math.floor((now.getTime() - new Date(expiredCompletedForms[0].available_until).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      suggestions.push({
        id: 'archive_completed_forms',
        type: 'archive_old_forms',
        title: 'Archive Completed Forms',
        description: `${expiredCompletedForms.length} completed form(s) is completed ${daysSinceExpiry} days ago. Consider archiving them.`,
        action_text: 'View Forms',
        action_url: '/admin/forms?filter=completed',
        priority: 'low',
        created_at: now.toISOString()
      });
    }

    // 4. Check for draft forms
    const { data: draftForms, error: draftError } = await supabase
      .from('forms')
      .select('id, title, created_at')
      .eq('status', 'draft');

    if (draftError) {
      console.error('Error fetching draft forms:', draftError);
    } else if (draftForms && draftForms.length > 0) {
      suggestions.push({
        id: 'draft_forms',
        type: 'draft_forms',
        title: 'Draft Forms Pending',
        description: `${draftForms.length} draft form(s) need to be completed or deleted.`,
        action_text: 'View Drafts',
        action_url: '/admin/forms?filter=draft',
        priority: 'medium',
        created_at: now.toISOString()
      });
    }

    // 5. Check for forms with no submissions (published but no submissions at all)
    // Get all published forms
    const { data: publishedForms, error: publishedError } = await supabase
      .from('forms')
      .select('id, title, created_at')
      .eq('status', 'published');

    if (publishedError) {
      console.error('Error fetching published forms:', publishedError);
    } else if (publishedForms && publishedForms.length > 0) {
      // Check each form for any submissions
      const noSubmissionForms = [];
      
      for (const form of publishedForms) {
        const { data: submissions, error: submissionsError } = await supabase
          .from('submissions')
          .select('id')
          .eq('form_id', form.id);
        
        if (!submissionsError && (!submissions || submissions.length === 0)) {
          noSubmissionForms.push(form);
        }
      }

      if (noSubmissionForms.length > 0) {
        suggestions.push({
          id: 'no_submission_forms',
          type: 'inactive_forms',
          title: 'No Submission Forms',
          description: `${noSubmissionForms.length} published form(s) have no submissions. Consider reviewing or updating them.`,
          action_text: 'View Forms',
          action_url: '/admin/forms?filter=published',
          priority: 'low',
          created_at: now.toISOString()
        });
      }
    }

    // 6. Check for forms with inactive status
    const { data: inactiveStatusForms, error: inactiveStatusError } = await supabase
      .from('forms')
      .select('id, title, status')
      .eq('status', 'inactive');

    if (inactiveStatusError) {
      console.error('Error fetching inactive status forms:', inactiveStatusError);
    } else if (inactiveStatusForms && inactiveStatusForms.length > 0) {
      suggestions.push({
        id: 'inactive_status_forms',
        type: 'inactive_forms',
        title: 'Inactive Status Forms',
        description: `${inactiveStatusForms.length} form(s) have inactive status. Consider completing or archiving them.`,
        action_text: 'View Forms',
        action_url: '/admin/forms?filter=inactive',
        priority: 'medium',
        created_at: now.toISOString()
      });
    }

    // Sort suggestions by priority (high -> medium -> low)
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    suggestions.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    return NextResponse.json({ suggestions });

  } catch (error: any) {
    console.error('Error fetching dashboard suggestions:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}

// POST endpoint to ignore a suggestion
export async function POST(req: NextRequest) {
  try {
    const { supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }

    const { suggestion_id } = await req.json();

    if (!suggestion_id) {
      return createErrorResponse('Suggestion ID is required', 400);
    }

    // For now, we'll just return success since we're not persisting ignored suggestions
    // In a production app, you might want to store ignored suggestions in a database table
    
    return NextResponse.json({ 
      success: true, 
      message: 'Suggestion ignored successfully' 
    });

  } catch (error: any) {
    console.error('Error ignoring suggestion:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}
