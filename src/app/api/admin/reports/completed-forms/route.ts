import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

export interface CompletedForm {
  id: string;
  title: string;
  description: string | null;
  available_until: string;
  status: string;
  created_at: string;
  completed_date: string | null;
  users: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  submission_stats: {
    verified: number;
    submitted: number;
    in_progress: number;
    total: number;
    no_submission: number;
  };
}

export interface CompletedFormsResponse {
  completedForms: CompletedForm[];
  count: number;
  message: string;
}

// GET /api/admin/reports/completed-forms - Get all completed forms with submission statistics
export async function GET(req: NextRequest) {
  try {
    const { supabase, user, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }

    // Get query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    // Fetch completed forms with creator information
    const { data: forms, error: formsError } = await supabase
      .from('forms')
      .select(`
        id,
        title,
        description,
        available_until,
        status,
        created_at,
        updated_at,
        users!created_by (
          first_name,
          last_name
        )
      `)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (formsError) {
      console.error('Error fetching completed forms:', formsError);
      return createErrorResponse('Failed to fetch completed forms');
    }

    if (!forms || forms.length === 0) {
      return NextResponse.json({
        completedForms: [],
        count: 0,
        message: 'No completed forms found'
      });
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

    // Get total count of completed forms
    const { count: totalCount, error: countError } = await supabase
      .from('forms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    if (countError) {
      console.error('Error fetching total count:', countError);
    }

    // Calculate statistics for each form
    const formsWithStats: CompletedForm[] = await Promise.all(forms.map(async (form) => {
      const formSubmissions = submissions?.filter(sub => sub.form_id === form.id) || [];
      
      const verified = formSubmissions.filter(sub => sub.status === 'verified').length;
      const submitted = formSubmissions.filter(sub => sub.status === 'completed').length;
      const inProgress = formSubmissions.filter(sub => sub.status === 'in_progress').length;
      const total = formSubmissions.length;
      
      // Get the form's assignment data to calculate no_submission count
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .select('assigned_college_department, assigned_courses, assigned_students')
        .eq('id', form.id)
        .single();
      
      let noSubmission = 0;
      
      if (!formError && formData) {
        // Count assigned students based on form assignment
        let assignedStudentsQuery = supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student');
        
        // Apply assignment filters
        if (formData.assigned_college_department === 'Specific student') {
          if (formData.assigned_students && Array.isArray(formData.assigned_students) && formData.assigned_students.length > 0) {
            assignedStudentsQuery = assignedStudentsQuery.in('id', formData.assigned_students);
          } else {
            // No specific students assigned
            assignedStudentsQuery = assignedStudentsQuery.eq('id', 'nonexistent');
          }
        } else {
          // Apply department/course filters
          if (formData.assigned_college_department && formData.assigned_college_department !== 'All Colleges') {
            assignedStudentsQuery = assignedStudentsQuery.eq('college_department', formData.assigned_college_department);
          }
          
          if (formData.assigned_courses && Array.isArray(formData.assigned_courses) && formData.assigned_courses.length > 0) {
            const courseFilter = formData.assigned_courses.filter((course: string) => course && course.trim() !== '');
            if (courseFilter.length > 0) {
              assignedStudentsQuery = assignedStudentsQuery.in('course', courseFilter);
            }
          }
        }
        
        // Get assigned students count
        const { count: assignedCount, error: assignedError } = await assignedStudentsQuery;
        
        if (!assignedError && assignedCount) {
          // Calculate no_submission: total assigned - total submissions
          noSubmission = Math.max(0, assignedCount - total);
        }
      }

      return {
        id: form.id,
        title: form.title,
        description: form.description,
        available_until: form.available_until,
        status: form.status,
        created_at: form.created_at,
        completed_date: form.updated_at, // Use updated_at as completed_date
        users: (() => {
          if (!form.users) return null;
          if (Array.isArray(form.users) && form.users.length > 0) {
            return {
              first_name: form.users[0].first_name,
              last_name: form.users[0].last_name
            };
          }
          if (!Array.isArray(form.users)) {
            return {
              first_name: (form.users as any).first_name,
              last_name: (form.users as any).last_name
            };
          }
          return null;
        })(),
        submission_stats: {
          verified,
          submitted,
          in_progress: inProgress,
          total,
          no_submission: noSubmission
        }
      };
    }));

    return NextResponse.json({
      completedForms: formsWithStats,
      count: totalCount || 0,
      message: `Found ${formsWithStats.length} completed forms`
    });

  } catch (error: any) {
    console.error('Error in GET /api/admin/reports/completed-forms:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}
