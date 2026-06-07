// Form Access Control Utilities
// This module handles checking if a user can access a form based on assignments

export interface User {
  id: string;
  college_department: string | null;
  course: string | null;
}

export interface Form {
  id: string;
  assigned_college_department: string | null;
  assigned_courses: string[] | null;
  assigned_students: string[] | null;
  status: string;
  available_from: string | null;
  available_until: string | null;
}

/**
 * Check if a user can access a form based on assignment rules
 * @param user - The user trying to access the form
 * @param form - The form being accessed
 * @returns boolean indicating if access is allowed
 */
export function canUserAccessForm(user: User, form: Form): boolean {
  // Check if form is published or active
  if (form.status !== 'published' && form.status !== 'active') {
    return false;
  }

  // Check availability dates using Singapore timezone
  const now = new Date();
  const singaporeTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
  
  console.log('🔍 canUserAccessForm - Using Singapore Time:', singaporeTime.toISOString());
  
  if (form.available_from) {
    // Database stores Singapore time, convert to UTC for comparison
    const dbDate = new Date(form.available_from);
    const availableFromUTC = new Date(dbDate.getTime() - (8 * 60 * 60 * 1000)); // Subtract 8 hours
    console.log('  Available From (DB):', form.available_from, '-> Converted:', availableFromUTC.toISOString());
    
    if (availableFromUTC > singaporeTime) {
      console.log('❌ Form not yet available in canUserAccessForm');
      return false;
    }
  }
  
  if (form.available_until) {
    // Database stores Singapore time, convert to UTC for comparison
    const dbDate = new Date(form.available_until);
    const availableUntilUTC = new Date(dbDate.getTime() - (8 * 60 * 60 * 1000)); // Subtract 8 hours
    console.log('  Available Until (DB):', form.available_until, '-> Converted:', availableUntilUTC.toISOString());
    
    if (availableUntilUTC < singaporeTime) {
      console.log('❌ Form no longer available in canUserAccessForm');
      return false;
    }
  }
  
  console.log('✅ Form availability check passed in canUserAccessForm');

  // If no assignment is set, form is available to all users
  if (!form.assigned_college_department) {
    return true;
  }

  // If assigned to "All Colleges", all users can access
  if (form.assigned_college_department === 'All Colleges') {
    return true;
  }

  // If assigned to "Specific student", check if user is in the assigned students list
  if (form.assigned_college_department === 'Specific student') {
    if (!form.assigned_students || form.assigned_students.length === 0) {
      return false; // No students assigned
    }
    // Convert both to strings to ensure proper comparison
    const userId = String(user.id);
    const assignedStudentIds = form.assigned_students.map(id => String(id));
    return assignedStudentIds.includes(userId);
  }

  // Check if user's department matches the assigned department
  if (user.college_department !== form.assigned_college_department) {
    return false;
  }

  // If no specific courses are assigned, all users in the department can access
  if (!form.assigned_courses || form.assigned_courses.length === 0) {
    return true;
  }

  // Check if user's course is in the assigned courses
  if (!user.course) {
    return false; // User has no course specified
  }

  return form.assigned_courses.includes(user.course);
}

/**
 * Filter forms based on user access
 * @param forms - Array of forms to filter
 * @param user - The user to check access for
 * @returns Array of forms the user can access
 */
export function filterFormsByUserAccess(forms: Form[], user: User): Form[] {
  return forms.filter(form => canUserAccessForm(user, form));
}

/**
 * Get assignment summary for display
 * @param form - The form to get assignment summary for
 * @returns String description of the assignment
 */
export function getFormAssignmentSummary(form: Form): string {
  if (!form.assigned_college_department) {
    return 'Available to all students';
  }

  if (form.assigned_college_department === 'All Colleges') {
    return 'Available to all students';
  }

  if (form.assigned_college_department === 'Specific student') {
    if (!form.assigned_students || form.assigned_students.length === 0) {
      return 'No students assigned';
    }
    return `Available to ${form.assigned_students.length} specific student(s)`;
  }

  if (!form.assigned_courses || form.assigned_courses.length === 0) {
    return `Available to all students in ${form.assigned_college_department}`;
  }

  if (form.assigned_courses.length === 1) {
    return `Available to ${form.assigned_courses[0]} students`;
  }

  return `Available to ${form.assigned_courses.length} specific courses in ${form.assigned_college_department}`;
}
