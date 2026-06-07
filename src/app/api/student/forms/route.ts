import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth-helpers';
import { canUserAccessForm, filterFormsByUserAccess } from '@/lib/form-access-control';

// GET /api/student/forms - Get all forms assigned to a student
export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const { user, supabase, error } = await getAuthenticatedUser();
    
    if (error || !user) {
      return createUnauthorizedResponse();
    }
    
    const userId = user.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - No user ID found in session' }, { status: 401 });
    }
    
    // Get query parameters for pagination
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const page = parseInt(url.searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    
    // First, get user's profile information for access control
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('college_department, course')
      .eq('id', userId)
      .single();

    if (userError) {
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    // Get all published forms with assignment information
    const { data: allForms, error: formsError } = await supabase
      .from('forms')
      .select(`
        id,
        title,
        description,
        available_from,
        available_until,
        assigned_college_department,
        assigned_courses,
        assigned_students,
        status
      `)
      .in('status', ['published', 'active'])
      .order('created_at', { ascending: false });
    
    if (formsError) {
      return NextResponse.json({ error: formsError.message }, { status: 500 });
    }

    // Filter forms based on user access control
    const userForAccessControl = {
      id: userId,
      college_department: userProfile.college_department,
      course: userProfile.course
    };

    const accessibleForms = filterFormsByUserAccess(allForms || [], userForAccessControl);
    
    // Filter forms by availability window using Singapore timezone
    const now = new Date();
    const singaporeTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
    
    console.log('🕐 Student Forms API - Using Singapore Time:', singaporeTime.toISOString());
    
    const availableForms = accessibleForms.filter(form => {
      // Check if form is within availability window
      // Convert database timestamps to Singapore timezone for proper comparison
      let availableFromSG = null;
      let availableUntilSG = null;
      
      if (form.available_from) {
        // Database stores Singapore time, convert to UTC for comparison
        const dbDate = new Date(form.available_from);
        availableFromSG = new Date(dbDate.getTime() - (8 * 60 * 60 * 1000)); // Subtract 8 hours
      }
      
      if (form.available_until) {
        // Database stores Singapore time, convert to UTC for comparison
        const dbDate = new Date(form.available_until);
        availableUntilSG = new Date(dbDate.getTime() - (8 * 60 * 60 * 1000)); // Subtract 8 hours
      }
      
      if (availableFromSG && singaporeTime < availableFromSG) {
        return false; // Form not yet available
      }
      if (availableUntilSG && singaporeTime > availableUntilSG) {
        return false; // Form no longer available
      }
      return true;
    });
    
    // Apply pagination to filtered results
    const paginatedForms = availableForms.slice(offset, offset + limit);
    
    // Then, get all submissions by this student
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select(`
        id,
        form_id,
        status,
        submitted_at
      `)
      .eq('student_id', userId);
    
    if (submissionsError) {
      return NextResponse.json({ error: submissionsError.message }, { status: 500 });
    }
    
    // Create a map of form_id to submission status
    const submissionMap = new Map();
    submissions?.forEach(submission => {
      submissionMap.set(submission.form_id, {
        id: submission.id,
        status: submission.status,
        submitted_at: submission.submitted_at
      });
    });
    
    // Combine the data
    const formsWithSubmissionStatus = paginatedForms?.map(form => {
      const submission = submissionMap.get(form.id);
      
      // Map database status to display status
      let displayStatus = null;
      if (submission) {
        if (submission.status === 'verified') {
          displayStatus = 'verified';
        } else if (submission.status === 'completed') {
          displayStatus = 'submitted';
        } else if (submission.status === 'in_progress') {
          displayStatus = 'pending';
        } else {
          // Default to pending for any other status
          displayStatus = 'pending';
        }
      }
      
      return {
        ...form,
        submission_status: displayStatus,
        submission_id: submission?.id || null
      };
    });
    
    // Get the total count (count of accessible forms)
    const totalAccessibleForms = availableForms.length;
    
    return NextResponse.json({
      forms: formsWithSubmissionStatus || [],
      pagination: {
        total: totalAccessibleForms,
        page,
        limit,
        pages: totalAccessibleForms ? Math.ceil(totalAccessibleForms / limit) : 0
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'An error occurred',
      stack: error.stack
    }, { status: 500 });
  }
} 