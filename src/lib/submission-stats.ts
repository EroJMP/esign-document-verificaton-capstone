// Submission Statistics Utilities
// This module handles calculation of submission statistics and data processing

export interface StudentWithSubmission {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  college_department: string | null;
  course: string | null;
  year_section: string | null;
  submission_status: 'Verified' | 'Submitted' | 'Rejected' | 'In Progress' | 'No Submission';
  submitted_at: string;
  submission_id: string | null;
}

export interface SubmissionStats {
  total_assigned: number;
  total_verified: number;
  total_submitted: number;
  total_rejected: number;
  total_in_progress: number;
  total_no_submission: number;
}

export interface FormAssignment {
  id: string;
  title: string;
  assigned_college_department: string | null;
  assigned_courses: string[] | null;
}

/**
 * Calculate submission statistics from a list of students
 * @param students - Array of students with submission status
 * @returns Submission statistics object
 */
export function calculateSubmissionStats(students: StudentWithSubmission[]): SubmissionStats {
  return {
    total_assigned: students.length,
    total_verified: students.filter(s => s.submission_status === 'Verified').length,
    total_submitted: students.filter(s => s.submission_status === 'Submitted').length,
    total_rejected: students.filter(s => s.submission_status === 'Rejected').length,
    total_in_progress: students.filter(s => s.submission_status === 'In Progress').length,
    total_no_submission: students.filter(s => s.submission_status === 'No Submission').length
  };
}

/**
 * Get assignment summary for display
 * @param form - Form assignment information
 * @returns String description of the assignment
 */
export function getAssignmentSummary(form: FormAssignment): string {
  if (!form.assigned_college_department) {
    return 'Available to all students';
  }

  if (form.assigned_college_department === 'All Colleges') {
    return 'Available to all students';
  }

  if (!form.assigned_courses || form.assigned_courses.length === 0) {
    return `Available to all students in ${form.assigned_college_department}`;
  }

  if (form.assigned_courses.length === 1) {
    return `Available to ${form.assigned_courses[0]} students`;
  }

  return `Available to ${form.assigned_courses.length} specific courses in ${form.assigned_college_department}`;
}

/**
 * Filter students based on search and filter criteria
 * @param students - Array of students to filter
 * @param filters - Filter criteria
 * @returns Filtered array of students
 */
export function filterStudents(
  students: StudentWithSubmission[],
  filters: {
    search?: string;
    college?: string;
    course?: string;
    section?: string;
    status?: string;
  }
): StudentWithSubmission[] {
  return students.filter(student => {
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const matchesSearch = 
        student.student_id?.toLowerCase().includes(searchTerm) ||
        student.first_name?.toLowerCase().includes(searchTerm) ||
        student.last_name?.toLowerCase().includes(searchTerm) ||
        student.email?.toLowerCase().includes(searchTerm);
      
      if (!matchesSearch) return false;
    }

    // College filter
    if (filters.college && student.college_department !== filters.college) {
      return false;
    }

    // Course filter
    if (filters.course && student.course !== filters.course) {
      return false;
    }

    // Section filter
    if (filters.section && !student.year_section?.toLowerCase().includes(filters.section.toLowerCase())) {
      return false;
    }

    // Status filter
    if (filters.status && student.submission_status !== filters.status) {
      return false;
    }

    return true;
  });
}

/**
 * Get unique values for filter dropdowns
 * @param students - Array of students
 * @returns Object with unique values for each filter
 */
export function getFilterOptions(students: StudentWithSubmission[]): {
  colleges: string[];
  courses: string[];
  sections: string[];
  statuses: string[];
} {
  const colleges = [...new Set(students.map(s => s.college_department).filter((college): college is string => Boolean(college)))].sort();
  const courses = [...new Set(students.map(s => s.course).filter((course): course is string => Boolean(course)))].sort();
  const sections = [...new Set(students.map(s => s.year_section).filter((section): section is string => Boolean(section)))].sort();
  const statuses = [...new Set(students.map(s => s.submission_status))].sort();

  return {
    colleges,
    courses,
    sections,
    statuses
  };
}

/**
 * Format submitted date for display
 * @param submittedAt - Submitted date string
 * @returns Formatted date string or 'N/A'
 */
export function formatSubmittedDate(submittedAt: string): string {
  if (!submittedAt || submittedAt === 'N/A') {
    return 'N/A';
  }

  try {
    const date = new Date(submittedAt);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'N/A';
  }
}

/**
 * Get status badge color for UI
 * @param status - Submission status
 * @returns Tailwind CSS color classes
 */
export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'Verified':
      return 'bg-blue-100 text-blue-800';
    case 'Submitted':
      return 'bg-green-100 text-green-800';
    case 'Rejected':
      return 'bg-red-100 text-red-800';
    case 'In Progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'No Submission':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
