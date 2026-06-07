'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Filter, User, Mail, Calendar, Building, GraduationCap, Users, MoreVertical, Edit, Trash2, Upload, FileText, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface StudentUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  student_id: string | null;
  college_department: string | null;
  course: string | null;
  year_section: string | null;
  guardian_email: string | null;
  role: string;
  created_at: string;
}

export default function StudentsAccountTab() {
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // Modal states
  const [showActionModal, setShowActionModal] = useState(false);
  const [showGuardianModal, setShowGuardianModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentUser | null>(null);
  const [guardianEmail, setGuardianEmail] = useState('');
  const [newSection, setNewSection] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  
  // Batch update states
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [batchPreview, setBatchPreview] = useState<any[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  
  // Batch guardian email states
  const [showGuardianBatchModal, setShowGuardianBatchModal] = useState(false);
  const [guardianCsvFile, setGuardianCsvFile] = useState<File | null>(null);
  const [guardianCsvData, setGuardianCsvData] = useState<any[]>([]);
  const [guardianBatchPreview, setGuardianBatchPreview] = useState<any[]>([]);
  const [guardianBatchLoading, setGuardianBatchLoading] = useState(false);
  const [guardianBatchProgress, setGuardianBatchProgress] = useState({ current: 0, total: 0 });
  
  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const [isGuardianDragOver, setIsGuardianDragOver] = useState(false);
  
  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const guardianFileInputRef = useRef<HTMLInputElement>(null);
  
  const supabase = createClient();

  // Get unique values for filters
  const departments = [...new Set(students.map(s => s.college_department).filter(Boolean))] as string[];
  const courses = [...new Set(students.map(s => s.course).filter(Boolean))] as string[];
  const sections = [...new Set(students.map(s => s.year_section).filter(Boolean))] as string[];

  useEffect(() => {
    fetchStudents();
  }, []);

  // Auto-dismiss messages after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/users?role=student');
      const result = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: result.error || 'Failed to load student accounts' });
        return;
      }

      setStudents(result.users || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      setMessage({ type: 'error', text: 'Failed to load student accounts' });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      student.email.toLowerCase().includes(searchLower) ||
      (student.first_name && student.first_name.toLowerCase().includes(searchLower)) ||
      (student.last_name && student.last_name.toLowerCase().includes(searchLower)) ||
      (student.student_id && student.student_id.toLowerCase().includes(searchLower))
    );

    const matchesDepartment = !selectedDepartment || student.college_department === selectedDepartment;
    const matchesCourse = !selectedCourse || student.course === selectedCourse;
    const matchesSection = !selectedSection || student.year_section === selectedSection;

    return matchesSearch && matchesDepartment && matchesCourse && matchesSection;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDisplayName = (student: StudentUser) => {
    if (student.first_name && student.last_name) {
      return `${student.first_name} ${student.last_name}`;
    }
    return student.email;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('');
    setSelectedCourse('');
    setSelectedSection('');
  };

  const handleActionClick = (student: StudentUser) => {
    setSelectedStudent(student);
    setShowActionModal(true);
  };

  const handleGuardianEmailUpdate = async () => {
    if (!selectedStudent || !guardianEmail.trim()) return;

    try {
      setModalLoading(true);
      
      const response = await fetch(`/api/users/${selectedStudent.id}/partial-update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guardian_email: guardianEmail.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: result.error || 'Failed to update guardian email' });
        return;
      }

      setMessage({ type: 'success', text: 'Guardian email updated successfully' });
      setShowGuardianModal(false);
      setShowActionModal(false);
      setGuardianEmail('');
      await fetchStudents();
    } catch (error) {
      console.error('Error updating guardian email:', error);
      setMessage({ type: 'error', text: 'Failed to update guardian email' });
    } finally {
      setModalLoading(false);
    }
  };

  const handleSectionUpdate = async () => {
    if (!selectedStudent || !newSection.trim()) return;

    try {
      setModalLoading(true);
      
      const response = await fetch(`/api/users/${selectedStudent.id}/partial-update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year_section: newSection.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: result.error || 'Failed to update section' });
        return;
      }

      setMessage({ type: 'success', text: 'Section updated successfully' });
      setShowSectionModal(false);
      setShowActionModal(false);
      setNewSection('');
      await fetchStudents();
    } catch (error) {
      console.error('Error updating section:', error);
      setMessage({ type: 'error', text: 'Failed to update section' });
    } finally {
      setModalLoading(false);
    }
  };

  const closeAllModals = () => {
    setShowActionModal(false);
    setShowGuardianModal(false);
    setShowSectionModal(false);
    setShowBatchModal(false);
    setShowGuardianBatchModal(false);
    setSelectedStudent(null);
    setGuardianEmail('');
    setNewSection('');
    setCsvFile(null);
    setCsvData([]);
    setBatchPreview([]);
    setGuardianCsvFile(null);
    setGuardianCsvData([]);
    setGuardianBatchPreview([]);
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setMessage({ type: 'error', text: 'Please upload a CSV file' });
      return;
    }

    setCsvFile(file);
    parseCsvFile(file);
  };

  const parseCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setMessage({ type: 'error', text: 'CSV file must have at least a header and one data row' });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredHeaders = ['student_id', 'name', 'section'];
      
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
      if (missingHeaders.length > 0) {
        setMessage({ type: 'error', text: `Missing required columns: ${missingHeaders.join(', ')}` });
        return;
      }

      const data = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        return {
          row: index + 2,
          student_id: values[headers.indexOf('student_id')],
          name: values[headers.indexOf('name')],
          section: values[headers.indexOf('section')]
        };
      }).filter(row => row.student_id && row.name && row.section);

      setCsvData(data);
      generateBatchPreview(data);
    };
    reader.readAsText(file);
  };

  const generateBatchPreview = (data: any[]) => {
    const preview = data.map(row => {
      const student = students.find(s => s.student_id === row.student_id);
      return {
        ...row,
        found: !!student,
        currentSection: student?.year_section || 'Not set',
        newSection: row.section,
        studentName: student ? `${student.first_name} ${student.last_name}` : 'Not found'
      };
    });

    setBatchPreview(preview);
  };

  const handleBatchUpdate = async () => {
    if (batchPreview.length === 0) return;

    try {
      setBatchLoading(true);
      setBatchProgress({ current: 0, total: batchPreview.length });

      const updates = batchPreview.filter(item => item.found);
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < updates.length; i++) {
        const item = updates[i];
        const student = students.find(s => s.student_id === item.student_id);
        
        if (student) {
          try {
            const response = await fetch(`/api/users/${student.id}/partial-update`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                year_section: item.newSection,
              }),
            });

            if (response.ok) {
              successCount++;
            } else {
              errorCount++;
            }
          } catch (error) {
            errorCount++;
          }
        }

        setBatchProgress({ current: i + 1, total: updates.length });
      }

      setMessage({ 
        type: successCount > 0 ? 'success' : 'error', 
        text: `Batch update completed: ${successCount} successful, ${errorCount} failed` 
      });

      await fetchStudents();
      closeAllModals();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to process batch update' });
    } finally {
      setBatchLoading(false);
    }
  };

  const handleGuardianCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setMessage({ type: 'error', text: 'Please upload a CSV file' });
      return;
    }

    setGuardianCsvFile(file);
    parseGuardianCsvFile(file);
  };

  const parseGuardianCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setMessage({ type: 'error', text: 'CSV file must have at least a header and one data row' });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredHeaders = ['student_id', 'name', 'guardian_email'];
      
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
      if (missingHeaders.length > 0) {
        setMessage({ type: 'error', text: `Missing required columns: ${missingHeaders.join(', ')}` });
        return;
      }

      const data = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        return {
          row: index + 2,
          student_id: values[headers.indexOf('student_id')],
          name: values[headers.indexOf('name')],
          guardian_email: values[headers.indexOf('guardian_email')]
        };
      }).filter(row => row.student_id && row.name && row.guardian_email);

      setGuardianCsvData(data);
      generateGuardianBatchPreview(data);
    };
    reader.readAsText(file);
  };

  const generateGuardianBatchPreview = (data: any[]) => {
    const preview = data.map(row => {
      const student = students.find(s => s.student_id === row.student_id);
      return {
        ...row,
        found: !!student,
        currentGuardianEmail: student?.guardian_email || 'Not set',
        newGuardianEmail: row.guardian_email,
        studentName: student ? `${student.first_name} ${student.last_name}` : 'Not found'
      };
    });

    setGuardianBatchPreview(preview);
  };

  const handleGuardianBatchUpdate = async () => {
    if (guardianBatchPreview.length === 0) return;

    try {
      setGuardianBatchLoading(true);
      setGuardianBatchProgress({ current: 0, total: guardianBatchPreview.length });

      const updates = guardianBatchPreview.filter(item => item.found);
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < updates.length; i++) {
        const item = updates[i];
        const student = students.find(s => s.student_id === item.student_id);
        
        if (student) {
          try {
            const response = await fetch(`/api/users/${student.id}/partial-update`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                guardian_email: item.newGuardianEmail,
              }),
            });

            if (response.ok) {
              successCount++;
            } else {
              errorCount++;
            }
          } catch (error) {
            errorCount++;
          }
        }

        setGuardianBatchProgress({ current: i + 1, total: updates.length });
      }

      setMessage({ 
        type: successCount > 0 ? 'success' : 'error', 
        text: `Guardian email batch update completed: ${successCount} successful, ${errorCount} failed` 
      });

      await fetchStudents();
      closeAllModals();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to process guardian email batch update' });
    } finally {
      setGuardianBatchLoading(false);
    }
  };

  // Drag and drop handlers for section updates
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.csv')) {
        setCsvFile(file);
        parseCsvFile(file);
      } else {
        setMessage({ type: 'error', text: 'Please upload a CSV file' });
      }
    }
  };

  // Drag and drop handlers for guardian email updates
  const handleGuardianDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsGuardianDragOver(true);
  };

  const handleGuardianDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsGuardianDragOver(false);
  };

  const handleGuardianDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsGuardianDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.csv')) {
        setGuardianCsvFile(file);
        parseGuardianCsvFile(file);
      } else {
        setMessage({ type: 'error', text: 'Please upload a CSV file' });
      }
    }
  };

  // Click handlers for upload areas
  const handleUploadAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleGuardianUploadAreaClick = () => {
    guardianFileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        {/* Search Bar */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search students by name, email, or student ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-500">Filters:</span>
          </div>
          
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm w-70"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept || ''}>{dept}</option>
            ))}
          </select>

          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm w-70"
          >
            <option value="">All Courses</option>
            {courses.map(course => (
              <option key={course} value={course || ''}>{course}</option>
            ))}
          </select>

          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm w-40"
          >
            <option value="">All Sections</option>
            {sections.map(section => (
              <option key={section} value={section || ''}>{section}</option>
            ))}
          </select>

          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700' 
            : 'bg-red-50 text-red-700'
        }`}>
          <div className="flex items-center justify-between">
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="ml-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-700">
          Showing {filteredStudents.length} of {students.length} students
        </p>
        <div className="flex items-center space-x-4">
          {(selectedDepartment || selectedCourse || selectedSection || searchTerm) && (
            <p className="text-sm text-gray-500">
              Filters applied
            </p>
          )}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowBatchModal(true)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              <Upload className="h-4 w-4 mr-2" />
              Batch Update Section
            </button>
            <button
              onClick={() => setShowGuardianBatchModal(true)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
            >
              <Upload className="h-4 w-4 mr-2" />
              Batch Update Guardian Email
            </button>
          </div>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm || selectedDepartment || selectedCourse || selectedSection 
                ? 'No students found' 
                : 'No student accounts'
              }
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedDepartment || selectedCourse || selectedSection
                ? 'Try adjusting your search terms or filters.' 
                : 'Student accounts will appear here when they register.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[130px]">
                    Student ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Section
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guardian Email
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 group">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 min-w-[130px]">
                      {student.student_id || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {getDisplayName(student)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.college_department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.course || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.year_section || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.guardian_email || 'Not set'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => handleActionClick(student)}
                          className="p-2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded"
                          title="Edit student"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Selection Modal */}
      {showActionModal && selectedStudent && (
        <div className="modal-backdrop fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Manage Student</h3>
                <button
                  onClick={closeAllModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  What would you like to do for <strong>{getDisplayName(selectedStudent)}</strong>?
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowActionModal(false);
                    setGuardianEmail(selectedStudent.guardian_email || '');
                    setShowGuardianModal(true);
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
                >
                  Update Guardian Email
                </button>
                <button
                  onClick={() => {
                    setShowActionModal(false);
                    setNewSection(selectedStudent.year_section || '');
                    setShowSectionModal(true);
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Update Section
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guardian Email Update Modal */}
      {showGuardianModal && selectedStudent && (
        <div className="modal-backdrop fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Update Guardian Email</h3>
                <button
                  onClick={closeAllModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mb-4">
                <label htmlFor="guardian-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Guardian Email
                </label>
                <input
                  type="email"
                  id="guardian-email"
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Enter guardian email"
                />
              </div>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={closeAllModals}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGuardianEmailUpdate}
                  disabled={modalLoading || !guardianEmail.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-md"
                >
                  {modalLoading ? 'Updating...' : 'Update Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section Update Modal */}
      {showSectionModal && selectedStudent && (
        <div className="modal-backdrop fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Update Section</h3>
                <button
                  onClick={closeAllModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mb-4">
                <label htmlFor="new-section" className="block text-sm font-medium text-gray-700 mb-2">
                  Section
                </label>
                <input
                  type="text"
                  id="new-section"
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Enter section (e.g., 1A, 2B, 3C)"
                />
              </div>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={closeAllModals}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSectionUpdate}
                  disabled={modalLoading || !newSection.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md"
                >
                  {modalLoading ? 'Updating...' : 'Update Section'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Update Modal */}
      {showBatchModal && (
        <div className="modal-backdrop fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Batch Update Student Sections</h3>
                <button
                  onClick={closeAllModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {!csvFile ? (
                <div className="space-y-4">
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 transition-colors duration-200 cursor-pointer ${
                      isDragOver 
                        ? 'border-blue-400 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleUploadAreaClick}
                  >
                    <div className="text-center">
                      <Plus className={`mx-auto h-12 w-12 transition-colors duration-200 ${
                        isDragOver ? 'text-blue-500' : 'text-gray-400'
                      }`} />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        {isDragOver ? 'Drop CSV file here' : 'Upload CSV File'}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {isDragOver 
                          ? 'Release to upload the file' 
                          : 'Drag and drop a CSV file here, or click to browse'
                        }
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleCsvUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• First row must contain headers: student_id, name, section</li>
                      <li>• student_id: The student's ID (must match existing records)</li>
                      <li>• name: Student's full name (for verification)</li>
                      <li>• section: New section to assign (e.g., "1A", "2B", "3C")</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-900">{csvFile.name}</span>
                      <span className="text-sm text-gray-500">({csvData.length} records)</span>
                    </div>
                    <button
                      onClick={() => {
                        setCsvFile(null);
                        setCsvData([]);
                        setBatchPreview([]);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Change File
                    </button>
                  </div>

                  {batchPreview.length > 0 && (
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Preview Changes:</h4>
                        <div className="text-sm text-gray-600">
                          <p>• {batchPreview.filter(p => p.found).length} students will be updated</p>
                          <p>• {batchPreview.filter(p => !p.found).length} students not found in system</p>
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Current Section</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">New Section</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {batchPreview.map((item, index) => (
                              <tr key={index} className={item.found ? 'bg-white' : 'bg-red-50'}>
                                <td className="px-4 py-2 text-sm text-gray-900">{item.student_id}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{item.studentName}</td>
                                <td className="px-4 py-2 text-sm text-gray-500">{item.currentSection}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{item.newSection}</td>
                                <td className="px-4 py-2 text-sm">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    item.found 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {item.found ? 'Ready' : 'Not Found'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {batchLoading && (
                        <div className="bg-blue-50 p-4 rounded-md">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-blue-900">Processing Updates...</span>
                            <span className="text-sm text-blue-700">{batchProgress.current} / {batchProgress.total}</span>
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-end space-x-3">
                        <button
                          onClick={closeAllModals}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleBatchUpdate}
                          disabled={batchLoading || batchPreview.filter(p => p.found).length === 0}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md"
                        >
                          {batchLoading ? 'Processing...' : `Update ${batchPreview.filter(p => p.found).length} Students`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Guardian Email Batch Update Modal */}
      {showGuardianBatchModal && (
        <div className="modal-backdrop fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Batch Update Guardian Emails</h3>
                <button
                  onClick={closeAllModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {!guardianCsvFile ? (
                <div className="space-y-4">
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 transition-colors duration-200 cursor-pointer ${
                      isGuardianDragOver 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                    onDragOver={handleGuardianDragOver}
                    onDragLeave={handleGuardianDragLeave}
                    onDrop={handleGuardianDrop}
                    onClick={handleGuardianUploadAreaClick}
                  >
                    <div className="text-center">
                      <Plus className={`mx-auto h-12 w-12 transition-colors duration-200 ${
                        isGuardianDragOver ? 'text-green-500' : 'text-gray-400'
                      }`} />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        {isGuardianDragOver ? 'Drop CSV file here' : 'Upload CSV File'}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {isGuardianDragOver 
                          ? 'Release to upload the file' 
                          : 'Drag and drop a CSV file here, or click to browse'
                        }
                      </p>
                      <input
                        ref={guardianFileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleGuardianCsvUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-green-900 mb-2">CSV Format Requirements:</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• First row must contain headers: student_id, name, guardian_email</li>
                      <li>• student_id: The student's ID (must match existing records)</li>
                      <li>• name: Student's full name (for verification)</li>
                      <li>• guardian_email: New guardian email address</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-900">{guardianCsvFile.name}</span>
                      <span className="text-sm text-gray-500">({guardianCsvData.length} records)</span>
                    </div>
                    <button
                      onClick={() => {
                        setGuardianCsvFile(null);
                        setGuardianCsvData([]);
                        setGuardianBatchPreview([]);
                      }}
                      className="text-sm text-green-600 hover:text-green-700"
                    >
                      Change File
                    </button>
                  </div>

                  {guardianBatchPreview.length > 0 && (
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Preview Changes:</h4>
                        <div className="text-sm text-gray-600">
                          <p>• {guardianBatchPreview.filter(p => p.found).length} students will be updated</p>
                          <p>• {guardianBatchPreview.filter(p => !p.found).length} students not found in system</p>
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Current Guardian Email</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">New Guardian Email</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {guardianBatchPreview.map((item, index) => (
                              <tr key={index} className={item.found ? 'bg-white' : 'bg-red-50'}>
                                <td className="px-4 py-2 text-sm text-gray-900">{item.student_id}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{item.studentName}</td>
                                <td className="px-4 py-2 text-sm text-gray-500">{item.currentGuardianEmail}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{item.newGuardianEmail}</td>
                                <td className="px-4 py-2 text-sm">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    item.found 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {item.found ? 'Ready' : 'Not Found'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {guardianBatchLoading && (
                        <div className="bg-green-50 p-4 rounded-md">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-green-900">Processing Guardian Email Updates...</span>
                            <span className="text-sm text-green-700">{guardianBatchProgress.current} / {guardianBatchProgress.total}</span>
                          </div>
                          <div className="w-full bg-green-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(guardianBatchProgress.current / guardianBatchProgress.total) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-end space-x-3">
                        <button
                          onClick={closeAllModals}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleGuardianBatchUpdate}
                          disabled={guardianBatchLoading || guardianBatchPreview.filter(p => p.found).length === 0}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-md"
                        >
                          {guardianBatchLoading ? 'Processing...' : `Update ${guardianBatchPreview.filter(p => p.found).length} Guardian Emails`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
