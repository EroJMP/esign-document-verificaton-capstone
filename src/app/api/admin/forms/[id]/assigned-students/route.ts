import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const formId = params.id;
    
    // Get query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') || '';
    const collegeFilter = url.searchParams.get('college') || '';
    const courseFilter = url.searchParams.get('course') || '';
    const sectionFilter = url.searchParams.get('section') || '';
    const statusFilter = url.searchParams.get('status') || '';
    
    // First, get the form details to understand the assignment
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select(`
        id,
        title,
        assigned_college_department,
        assigned_courses,
        assigned_students
      `)
      .eq('id', formId)
      .single();
    
    if (formError) {
      console.error('Error fetching form:', formError);
      return createErrorResponse('Form not found', 404);
    }
    
    console.log('Form assignment data:', {
      id: form.id,
      title: form.title,
      assigned_college_department: form.assigned_college_department,
      assigned_courses: form.assigned_courses,
      assigned_students: form.assigned_students
    });
    
    // Handle forms that don't have assignment data yet (fallback to show all students)
    if (!form.assigned_college_department && !form.assigned_courses && !form.assigned_students) {
      console.log('Form has no assignment data, showing all students');
    }
    
    // Build the base query for assigned students (for stats calculation - NO filters applied)
    let baseStudentQuery = supabase
      .from('users')
      .select(`
        id,
        student_id,
        first_name,
        last_name,
        email,
        college_department,
        course,
        year_section
      `)
      .eq('role', 'student');
    
    // Handle specific student assignment
    if (form.assigned_college_department === 'Specific student') {
      if (form.assigned_students && Array.isArray(form.assigned_students) && form.assigned_students.length > 0) {
        // Filter to only the specifically assigned students
        baseStudentQuery = baseStudentQuery.in('id', form.assigned_students);
        console.log('Filtering to specific students:', form.assigned_students);
      } else {
        // No specific students assigned, return empty result
        console.log('No specific students assigned, returning empty result');
        return NextResponse.json({
          students: [],
          form: {
            id: form.id,
            title: form.title,
            assigned_college_department: form.assigned_college_department,
            assigned_courses: form.assigned_courses,
            assigned_students: form.assigned_students
          },
          stats: {
            total_assigned: 0,
            total_verified: 0,
            total_submitted: 0,
            total_in_progress: 0,
            total_no_submission: 0
          },
          pagination: {
            page: 1,
            limit: 50,
            total: 0,
            pages: 0
          }
        });
      }
    } else {
      // Apply assignment filters for department/course based assignments
      if (form.assigned_college_department && form.assigned_college_department !== 'All Colleges') {
        baseStudentQuery = baseStudentQuery.eq('college_department', form.assigned_college_department);
      }
      
      if (form.assigned_courses && Array.isArray(form.assigned_courses) && form.assigned_courses.length > 0) {
        // Use a more explicit approach for the course filter
        const courseFilter = form.assigned_courses.filter((course: string) => course && course.trim() !== '');
        if (courseFilter.length > 0) {
          baseStudentQuery = baseStudentQuery.in('course', courseFilter);
        }
      }
    }
    
    // Get ALL assigned students first (without any search/filter) for stats calculation
    const { data: allAssignedStudents, error: studentsError } = await baseStudentQuery
      .order('last_name', { ascending: true });
    
    if (studentsError) {
      console.error('Error fetching assigned students:', studentsError);
      console.error('Query parameters:', { formId, search, collegeFilter, courseFilter, sectionFilter });
      console.error('Form assignment:', { assigned_college_department: form.assigned_college_department, assigned_courses: form.assigned_courses });
      return createErrorResponse('Failed to fetch assigned students');
    }
    
    // Now create a separate query for filtered students (for table display)
    let filteredStudentQuery = baseStudentQuery;
    
    // Apply search filter
    if (search) {
      filteredStudentQuery = filteredStudentQuery.or(`student_id.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    
    // Apply additional filters
    if (collegeFilter) {
      filteredStudentQuery = filteredStudentQuery.eq('college_department', collegeFilter);
    }
    
    if (courseFilter) {
      filteredStudentQuery = filteredStudentQuery.eq('course', courseFilter);
    }
    
    if (sectionFilter) {
      filteredStudentQuery = filteredStudentQuery.ilike('year_section', `%${sectionFilter}%`);
    }
    
    // Get filtered students for table display
    const { data: filteredAssignedStudents, error: filteredStudentsError } = await filteredStudentQuery
      .order('last_name', { ascending: true });
    
    if (filteredStudentsError) {
      console.error('Error fetching filtered students:', filteredStudentsError);
      return createErrorResponse('Failed to fetch filtered students');
    }
    
    // Get all submissions for this form
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select(`
        id,
        student_id,
        status,
        submitted_at,
        created_at
      `)
      .eq('form_id', formId);
    
    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return createErrorResponse('Failed to fetch submissions');
    }
    
    // Create a map of submissions by student_id
    const submissionsMap = new Map();
    (submissions || []).forEach((submission: any) => {
      submissionsMap.set(submission.student_id, submission);
    });
    
    // Combine ALL students with their submission status (for stats calculation)
    const allStudentsWithSubmissionStatus = (allAssignedStudents || []).map((student: any) => {
      const submission = submissionsMap.get(student.id);
      
      let status = 'No Submission';
      let submittedAt = 'N/A';
      
      if (submission) {
        if (submission.status === 'verified') {
          status = 'Verified';
          submittedAt = submission.submitted_at || 'N/A';
        } else if (submission.status === 'completed') {
          status = 'Submitted';
          submittedAt = submission.submitted_at || 'N/A';
        } else if (submission.status === 'rejected') {
          status = 'Rejected';
          submittedAt = submission.submitted_at || 'N/A';
        } else if (submission.status === 'in_progress') {
          status = 'In Progress';
          submittedAt = 'N/A';
        } else {
          status = 'No Submission';
          submittedAt = 'N/A';
        }
      }
      
      return {
        ...student,
        submission_status: status,
        submitted_at: submittedAt,
        submission_id: submission?.id || null
      };
    });
    
    // Calculate statistics from ALL assigned students (independent of any filters)
    const stats = {
      total_assigned: allStudentsWithSubmissionStatus.length,
      total_verified: allStudentsWithSubmissionStatus.filter(s => s.submission_status === 'Verified').length,
      total_submitted: allStudentsWithSubmissionStatus.filter(s => s.submission_status === 'Submitted').length,
      total_rejected: allStudentsWithSubmissionStatus.filter(s => s.submission_status === 'Rejected').length,
      total_in_progress: allStudentsWithSubmissionStatus.filter(s => s.submission_status === 'In Progress').length,
      total_no_submission: allStudentsWithSubmissionStatus.filter(s => s.submission_status === 'No Submission').length
    };
    
    // Combine filtered students with their submission status (for table display)
    const filteredStudentsWithSubmissionStatus = (filteredAssignedStudents || []).map((student: any) => {
      const submission = submissionsMap.get(student.id);
      
      let status = 'No Submission';
      let submittedAt = 'N/A';
      
      if (submission) {
        if (submission.status === 'verified') {
          status = 'Verified';
          submittedAt = submission.submitted_at || 'N/A';
        } else if (submission.status === 'completed') {
          status = 'Submitted';
          submittedAt = submission.submitted_at || 'N/A';
        } else if (submission.status === 'rejected') {
          status = 'Rejected';
          submittedAt = submission.submitted_at || 'N/A';
        } else if (submission.status === 'in_progress') {
          status = 'In Progress';
          submittedAt = 'N/A';
        } else {
          status = 'No Submission';
          submittedAt = 'N/A';
        }
      }
      
      return {
        ...student,
        submission_status: status,
        submitted_at: submittedAt,
        submission_id: submission?.id || null
      };
    });
    
    // Apply status filter if specified (for table display only)
    let finalFilteredStudents = filteredStudentsWithSubmissionStatus;
    if (statusFilter) {
      finalFilteredStudents = filteredStudentsWithSubmissionStatus.filter(student => student.submission_status === statusFilter);
    }
    
    // Apply pagination to final filtered students for display
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedStudents = finalFilteredStudents.slice(startIndex, endIndex);
    
    return NextResponse.json({
      students: paginatedStudents,
      stats,
      pagination: {
        page,
        limit,
        total: finalFilteredStudents.length, // Use filtered students count for pagination
        pages: Math.ceil(finalFilteredStudents.length / limit) // Use filtered students for pages calculation
      },
      form: {
        id: form.id,
        title: form.title,
        assigned_college_department: form.assigned_college_department,
        assigned_courses: form.assigned_courses
      }
    });
    
  } catch (error: any) {
    console.error('Error in GET /api/admin/forms/[id]/assigned-students:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}
