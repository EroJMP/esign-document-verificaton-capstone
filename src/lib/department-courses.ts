// Department and Course mappings for PLPASIG
export interface Course {
  code: string;
  name: string;
  fullName: string;
}

export interface Department {
  code: string;
  name: string;
  courses: Course[];
}

export const DEPARTMENTS: Department[] = [
  {
    code: 'CBA',
    name: 'College of Business and Accountancy (CBA)',
    courses: [
      { code: 'BSA', name: 'BS Accountancy', fullName: 'BSA - BS Accountancy' },
      { code: 'BSBA', name: 'BS Business Administration Major in Marketing Management', fullName: 'BSBA - BS Business Administration Major in Marketing Management' },
      { code: 'BSENT', name: 'BS Entrepreneurship', fullName: 'BSENT - BS Entrepreneurship' }
    ]
  },
  {
    code: 'CIHM',
    name: 'College of International Hospitality Management (CIHM)',
    courses: [
      { code: 'BSHM', name: 'BS Hospitality Management', fullName: 'BSHM - BS Hospitality Management' }
    ]
  },
  {
    code: 'CCS',
    name: 'College of Computer Studies (CCS)',
    courses: [
      { code: 'BSIT', name: 'BS Information Technology', fullName: 'BSIT - BS Information Technology' },
      { code: 'BSCS', name: 'BS Computer Science', fullName: 'BSCS - BS Computer Science' }
    ]
  },
  {
    code: 'COED',
    name: 'College of Education (COED)',
    courses: [
      { code: 'BEED', name: 'Bachelor of Elementary Education', fullName: 'BEED - Bachelor of Elementary Education' },
      { code: 'BSED-ENG', name: 'Bachelor of Secondary Education Major in English', fullName: 'BSED-ENG - Bachelor of Secondary Education Major in English' },
      { code: 'BSED-MATH', name: 'Bachelor of Secondary Education Major in Mathematics', fullName: 'BSED-MATH - Bachelor of Secondary Education Major in Mathematics' },
      { code: 'BSED-FIL', name: 'Bachelor of Secondary Education Major in Filipino', fullName: 'BSED-FIL - Bachelor of Secondary Education Major in Filipino' }
    ]
  },
  {
    code: 'CAS',
    name: 'College of Arts and Sciences (CAS)',
    courses: [
      { code: 'ABPSYCH', name: 'AB Psychology', fullName: 'ABPSYCH - AB Psychology' }
    ]
  },
  {
    code: 'COE',
    name: 'College of Engineering (COE)',
    courses: [
      { code: 'BSECE', name: 'BS Electronics Engineering', fullName: 'BSECE - BS Electronics Engineering' }
    ]
  },
  {
    code: 'CON',
    name: 'College of Nursing (CON)',
    courses: [
      { code: 'BSN', name: 'BS Nursing', fullName: 'BSN - BS Nursing' }
    ]
  }
];

export function getCoursesByDepartment(departmentCode: string): Course[] {
  const department = DEPARTMENTS.find(dept => dept.code === departmentCode);
  return department ? department.courses : [];
}

export function getDepartmentByCode(departmentCode: string): Department | undefined {
  return DEPARTMENTS.find(dept => dept.code === departmentCode);
}

export function getCourseByCode(courseCode: string): Course | undefined {
  for (const department of DEPARTMENTS) {
    const course = department.courses.find(course => course.code === courseCode);
    if (course) return course;
  }
  return undefined;
}

export function validateEmailDomain(email: string): boolean {
  return email.endsWith('@plpasig.edu.ph');
}

export function validateStudentId(studentId: string): boolean {
  // Basic validation - can be enhanced based on actual student ID format
  return /^[A-Z0-9-]+$/.test(studentId) && studentId.length >= 5 && studentId.length <= 20;
}
