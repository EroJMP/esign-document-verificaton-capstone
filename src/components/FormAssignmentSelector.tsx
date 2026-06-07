'use client';

import { useState, useEffect } from 'react';
import { DEPARTMENTS, getCoursesByDepartment } from '@/lib/department-courses';
import StudentAutocomplete from './StudentAutocomplete';
import { X, User } from 'lucide-react';

interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  collegeDepartment: string;
  course: string;
  yearSection: string;
  displayText: string;
}

interface FormAssignmentSelectorProps {
  assignedCollegeDepartment: string;
  assignedCourses: string[];
  assignedStudents: Student[];
  onDepartmentChange: (department: string) => void;
  onCoursesChange: (courses: string[]) => void;
  onStudentsChange: (students: Student[]) => void;
  hasError?: boolean;
}

export default function FormAssignmentSelector({
  assignedCollegeDepartment,
  assignedCourses,
  assignedStudents,
  onDepartmentChange,
  onCoursesChange,
  onStudentsChange,
  hasError = false
}: FormAssignmentSelectorProps) {
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);

  // Update available courses when department changes
  useEffect(() => {
    if (assignedCollegeDepartment && assignedCollegeDepartment !== 'All Colleges') {
      const departmentCode = DEPARTMENTS.find(d => d.name === assignedCollegeDepartment)?.code;
      if (departmentCode) {
        const courses = getCoursesByDepartment(departmentCode);
        setAvailableCourses(courses.map(course => course.fullName));
      } else {
        setAvailableCourses([]);
      }
    } else {
      setAvailableCourses([]);
    }
  }, [assignedCollegeDepartment]);

  // Clear selected courses when department changes
  useEffect(() => {
    if (assignedCollegeDepartment === 'All Colleges') {
      onCoursesChange([]);
    } else if (assignedCollegeDepartment && availableCourses.length > 0) {
      // Filter out courses that are no longer available
      const validCourses = assignedCourses.filter(course => 
        availableCourses.includes(course)
      );
      if (validCourses.length !== assignedCourses.length) {
        onCoursesChange(validCourses);
      }
    }
  }, [assignedCollegeDepartment, availableCourses.length]); // Removed assignedCourses and onCoursesChange from dependencies

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDepartment = e.target.value;
    onDepartmentChange(selectedDepartment);
  };

  const handleCourseToggle = (course: string) => {
    const isSelected = assignedCourses.includes(course);
    if (isSelected) {
      onCoursesChange(assignedCourses.filter(c => c !== course));
    } else {
      onCoursesChange([...assignedCourses, course]);
    }
  };

  const handleSelectAllCourses = () => {
    if (assignedCourses.length === availableCourses.length) {
      onCoursesChange([]);
    } else {
      onCoursesChange([...availableCourses]);
    }
  };

  const handleStudentSelect = (student: Student) => {
    // Check if student is already selected
    const isAlreadySelected = assignedStudents.some(s => s.id === student.id);
    if (!isAlreadySelected) {
      onStudentsChange([...assignedStudents, student]);
    }
  };

  const handleStudentRemove = (studentId: string) => {
    onStudentsChange(assignedStudents.filter(s => s.id !== studentId));
  };

  return (
    <div className="space-y-6">
      {/* College Department Selection */}
      <div>
        <label htmlFor="assigned-college-department" className="block text-sm font-medium text-gray-700 mb-2">
          Assign to College Department <span className="text-red-500">*</span>
        </label>
        <select
          id="assigned-college-department"
          name="assignedCollegeDepartment"
          required
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
            hasError ? 'border-red-500' : 'border-gray-300'
          }`}
          value={assignedCollegeDepartment}
          onChange={handleDepartmentChange}
        >
          <option value="">Select Assignment Type</option>
          <option value="All Colleges">All Colleges</option>
          <option value="Specific student">Specific student</option>
          {DEPARTMENTS.map((dept) => (
            <option key={dept.code} value={dept.name}>
              {dept.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          Select "All Colleges" to make this form available to all students, or choose a specific department.
        </p>
      </div>

      {/* Course Selection */}
      {assignedCollegeDepartment && assignedCollegeDepartment !== 'All Colleges' && availableCourses.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Assign to Specific Courses
            </label>
            <button
              type="button"
              onClick={handleSelectAllCourses}
              className="text-sm text-green-600 hover:text-green-800 font-medium"
            >
              {assignedCourses.length === availableCourses.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
            {availableCourses.map((course) => (
              <label
                key={course}
                className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={assignedCourses.includes(course)}
                  onChange={() => handleCourseToggle(course)}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">{course}</span>
              </label>
            ))}
          </div>
          
          <p className="mt-2 text-sm text-gray-500">
            {assignedCourses.length === 0 
              ? 'Leave unselected to make this form available to all students in the selected department.'
              : `Selected ${assignedCourses.length} course(s). Students in these courses will have access to this form.`
            }
          </p>
        </div>
      )}

      {/* Specific Student Selection */}
      {assignedCollegeDepartment === 'Specific student' && (
        <div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Specific Students
            </label>
            <StudentAutocomplete
              onStudentSelect={handleStudentSelect}
              placeholder="Search for students by name, student ID, or email..."
            />
          </div>
          
          {assignedStudents && assignedStudents.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {assignedStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                >
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {student.fullName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {student.studentId} • {student.course}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStudentRemove(student.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <p className="mt-2 text-sm text-gray-500">
            {!assignedStudents || assignedStudents.length === 0 
              ? 'No students selected. Use the search box above to add students.'
              : `Selected ${assignedStudents.length} student(s). Only these students will have access to this form.`
            }
          </p>
        </div>
      )}

      {/* Assignment Summary */}
      {assignedCollegeDepartment && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Assignment Summary</h4>
          <div className="text-sm text-blue-700">
            <p><strong>Assignment Type:</strong> {assignedCollegeDepartment}</p>
            
            {assignedCollegeDepartment === 'Specific student' ? (
              <div>
                <p><strong>Selected Students:</strong></p>
                {assignedStudents && assignedStudents.length > 0 ? (
                  <ul className="list-disc list-inside ml-2 mt-1">
                    {assignedStudents.map((student) => (
                      <li key={student.id}>
                        {student.fullName} ({student.studentId}) - {student.course}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No students selected</p>
                )}
              </div>
            ) : assignedCourses.length > 0 ? (
              <div>
                <p><strong>Courses:</strong></p>
                <ul className="list-disc list-inside ml-2 mt-1">
                  {assignedCourses.map((course) => (
                    <li key={course}>{course}</li>
                  ))}
                </ul>
              </div>
            ) : assignedCollegeDepartment !== 'All Colleges' ? (
              <p><strong>Courses:</strong> All courses in this department</p>
            ) : (
              <p><strong>Access:</strong> All students</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
