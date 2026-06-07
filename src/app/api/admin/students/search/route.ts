import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

// GET /api/admin/students/search - Search for students with autocomplete
export async function GET(req: NextRequest) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    // Get query parameters
    const url = new URL(req.url);
    const search = url.searchParams.get('q') || '';
    const ids = url.searchParams.get('ids') || '';
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    // Handle loading students by IDs
    if (ids) {
      const studentIds = ids.split(',').filter(id => id.trim() !== '');
      if (studentIds.length > 0) {
        const { data: students, error: studentsError } = await supabase
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
          .eq('role', 'student')
          .in('id', studentIds);
        
        if (studentsError) {
          console.error('Error fetching students by IDs:', studentsError);
          return createErrorResponse('Failed to fetch students');
        }
        
        const formattedStudents = students?.map(student => ({
          id: student.id,
          studentId: student.student_id,
          firstName: student.first_name,
          lastName: student.last_name,
          fullName: `${student.first_name} ${student.last_name}`,
          email: student.email,
          collegeDepartment: student.college_department,
          course: student.course,
          yearSection: student.year_section,
          displayText: `${student.student_id} - ${student.first_name} ${student.last_name} (${student.course})`
        })) || [];
        
        return NextResponse.json({ students: formattedStudents });
      }
    }
    
    if (!search || search.trim().length < 2) {
      return NextResponse.json({ students: [] });
    }
    
    // Search for students
    const { data: students, error: studentsError } = await supabase
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
      .eq('role', 'student')
      .or(`student_id.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
      .order('last_name', { ascending: true })
      .limit(limit);
    
    if (studentsError) {
      console.error('Error searching students:', studentsError);
      return createErrorResponse('Failed to search students');
    }
    
    // Format the response
    const formattedStudents = students?.map(student => ({
      id: student.id,
      studentId: student.student_id,
      firstName: student.first_name,
      lastName: student.last_name,
      fullName: `${student.first_name} ${student.last_name}`,
      email: student.email,
      collegeDepartment: student.college_department,
      course: student.course,
      yearSection: student.year_section,
      displayText: `${student.student_id} - ${student.first_name} ${student.last_name} (${student.course})`
    })) || [];
    
    return NextResponse.json({ students: formattedStudents });
    
  } catch (error) {
    console.error('Error in student search:', error);
    return createErrorResponse('An error occurred while searching students');
  }
}
