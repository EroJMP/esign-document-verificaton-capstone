'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Download, User, Search, FileText, Clock, AlertCircle, XCircle, FileDown, Shield } from 'lucide-react';
import DataTable, { Column } from '@/components/ui/DataTable';
import { StudentWithSubmission, SubmissionStats, FormAssignment, getAssignmentSummary, formatSubmittedDate, getStatusBadgeColor, getFilterOptions } from '@/lib/submission-stats';

type Form = {
  id: string;
  title: string;
  description: string | null;
  status: string;
};

interface FormSubmissionsViewerProps {
  formId: string;
  backLink: string;
  backLabel: string;
  viewSubmissionBasePath: string;
}

export default function FormSubmissionsViewer({
  formId,
  backLink,
  backLabel,
  viewSubmissionBasePath
}: FormSubmissionsViewerProps) {
  const router = useRouter();
  
  const [form, setForm] = useState<Form | null>(null);
  const [formAssignment, setFormAssignment] = useState<FormAssignment | null>(null);
  const [students, setStudents] = useState<StudentWithSubmission[]>([]);
  const [stats, setStats] = useState<SubmissionStats>({
    total_assigned: 0,
    total_verified: 0,
    total_submitted: 0,
    total_rejected: 0,
    total_in_progress: 0,
    total_no_submission: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filter options
  const [filterOptions, setFilterOptions] = useState({
    colleges: [] as string[],
    courses: [] as string[],
    sections: [] as string[],
    statuses: [] as string[]
  });

  useEffect(() => {
    if (formId) {
      fetchFormAndAssignedStudents();
    }
  }, [formId, currentPage, searchTerm, collegeFilter, courseFilter, sectionFilter, statusFilter]);

  const fetchFormAndAssignedStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50'
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (collegeFilter) params.append('college', collegeFilter);
      if (courseFilter) params.append('course', courseFilter);
      if (sectionFilter) params.append('section', sectionFilter);
      if (statusFilter) params.append('status', statusFilter);

      // Fetch form details and assigned students
      const [formResponse, studentsResponse] = await Promise.all([
        fetch(`/api/admin/forms/${formId}`),
        fetch(`/api/admin/forms/${formId}/assigned-students?${params}`)
      ]);

      if (!formResponse.ok) {
        throw new Error('Failed to fetch form details');
      }

      if (!studentsResponse.ok) {
        throw new Error('Failed to fetch assigned students');
      }

      const formData = await formResponse.json();
      const studentsData = await studentsResponse.json();

      setForm(formData.form);
      setFormAssignment(studentsData.form);
      setStudents(studentsData.students || []);
      setStats(studentsData.stats);
      setTotalPages(studentsData.pagination.pages);
      setTotalCount(studentsData.pagination.total);
      
      // Update filter options
      setFilterOptions(getFilterOptions(studentsData.students || []) as {
        colleges: string[];
        courses: string[];
        sections: string[];
        statuses: string[];
      });
      
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      setError((error as Error).message || 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubmission = (submissionId: string) => {
    if (submissionId) {
      router.push(`${viewSubmissionBasePath}/${formId}/submissions/${submissionId}`);
    }
  };

  const handleDownloadSubmission = async (submissionId: string) => {
    if (!submissionId) return;
    
    try {
      const response = await fetch(`/api/admin/forms/${formId}/submissions/${submissionId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `submission-${submissionId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading submission:', error);
    }
  };

  const handleExportToCSV = async () => {
    try {
      setLoading(true);
      
      // Fetch all students with current filters (no pagination limit)
      const params = new URLSearchParams({
        page: '1',
        limit: '10000' // Large limit to get all records
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (collegeFilter) params.append('college', collegeFilter);
      if (courseFilter) params.append('course', courseFilter);
      if (sectionFilter) params.append('section', sectionFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/admin/forms/${formId}/assigned-students?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data for export');
      }

      const data = await response.json();
      const allStudents = data.students || [];

      // Convert to CSV
      const csvHeaders = [
        'Student ID',
        'First Name',
        'Last Name',
        'Email',
        'College/Department',
        'Course',
        'Section',
        'Submission Status',
        'Submitted At',
        'Submission ID'
      ];

      const csvRows = allStudents.map((student: StudentWithSubmission) => {
        return [
          student.student_id || '',
          student.first_name || '',
          student.last_name || '',
          student.email || '',
          student.college_department || 'N/A',
          student.course || 'N/A',
          student.year_section || 'N/A',
          student.submission_status || 'No Submission',
          formatSubmittedDate(student.submitted_at) || 'N/A',
          student.submission_id || 'N/A'
        ];
      });

      // Escape CSV values (handle commas, quotes, newlines)
      const escapeCsvValue = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csvContent = [
        csvHeaders.map(escapeCsvValue).join(','),
        ...csvRows.map((row: string[]) => row.map(escapeCsvValue).join(','))
      ].join('\n');

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = `${form?.title || 'form'}_submissions_${new Date().toISOString().split('T')[0]}.csv`;
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error exporting to CSV:', error);
      setError(error.message || 'Failed to export to CSV');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCollegeFilter('');
    setCourseFilter('');
    setSectionFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Verified':
        return <Shield className="h-4 w-4" />;
      case 'Submitted':
        return <FileText className="h-4 w-4" />;
      case 'In Progress':
        return <Clock className="h-4 w-4" />;
      case 'No Submission':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const columns: Column<StudentWithSubmission>[] = [
    {
      key: 'student_id',
      header: 'Student ID',
      sortable: true,
      render: (student) => (
        <span className="font-mono text-sm">{student.student_id}</span>
      )
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (student) => (
        <div>
          <div className="font-medium">{student.first_name} {student.last_name}</div>
          <div className="text-sm text-gray-500">{student.email}</div>
        </div>
      )
    },
    {
      key: 'college_department',
      header: 'College',
      sortable: true,
      render: (student) => (
        <span className="text-sm">{student.college_department || 'N/A'}</span>
      )
    },
    {
      key: 'course',
      header: 'Course',
      sortable: true,
      render: (student) => (
        <span className="text-sm">{student.course || 'N/A'}</span>
      )
    },
    {
      key: 'year_section',
      header: 'Section',
      sortable: true,
      render: (student) => (
        <span className="text-sm">{student.year_section || 'N/A'}</span>
      )
    },
    {
      key: 'submission_status',
      header: 'Status',
      sortable: true,
      render: (student) => (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(student.submission_status)}`}>
          {getStatusIcon(student.submission_status)}
          {student.submission_status}
        </span>
      )
    },
    {
      key: 'submitted_at',
      header: 'Submitted At',
      sortable: true,
      render: (student) => (
        <span className="text-sm">{formatSubmittedDate(student.submitted_at)}</span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (student) => (
        <div className="flex items-center gap-2">
          {student.submission_id ? (
            student.submission_status === 'In Progress' ? (
              <span className="text-gray-500 text-sm">In Progress</span>
            ) : (
              <>
                <button
                  onClick={() => handleViewSubmission(student.submission_id!)}
                  className="p-2 text-blue-600 hover:text-blue-800"
                  title="View Submission"
                >
                  <Eye className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDownloadSubmission(student.submission_id!)}
                  className="p-2 text-green-600 hover:text-green-800"
                  title="Download PDF"
                >
                  <Download className="h-5 w-5" />
                </button>
              </>
            )
          ) : (
            <span className="text-gray-400 text-sm">No submission</span>
          )}
        </div>
      )
    }
  ];

  if (loading && !form) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href={backLink}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Form Submissions
        </h1>
        
        <div className="text-gray-600">
          <h2 className="text-lg font-semibold">{form?.title}</h2>
          {formAssignment && (
            <p className="text-sm mt-1">
              <strong>Assignment:</strong> {getAssignmentSummary(formAssignment)}
            </p>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Verified</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_verified}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Submitted</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_submitted}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_in_progress}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Rejected</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_rejected}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <XCircle className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total No Submission</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_no_submission}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student ID, name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select
              value={collegeFilter}
              onChange={(e) => setCollegeFilter(e.target.value)}
              className="w-70 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 truncate"
              title={collegeFilter || "All Colleges"}
            >
              <option value="">All Colleges</option>
              {filterOptions.colleges.map(college => (
                <option key={college} value={college} title={college}>{college}</option>
              ))}
            </select>
            
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-70 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 truncate"
              title={courseFilter || "All Courses"}
            >
              <option value="">All Courses</option>
              {filterOptions.courses.map(course => (
                <option key={course} value={course} title={course}>{course}</option>
              ))}
            </select>
            
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-44 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 truncate"
              title={sectionFilter || "All Sections"}
            >
              <option value="">All Sections</option>
              {filterOptions.sections.map(section => (
                <option key={section} value={section} title={section}>{section}</option>
              ))}
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-44 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 truncate"
              title={statusFilter || "All Statuses"}
            >
              <option value="">All Statuses</option>
              {filterOptions.statuses.map(status => (
                <option key={status} value={status} title={status}>{status}</option>
              ))}
            </select>
            
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 whitespace-nowrap"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Assigned Students ({totalCount})
            </h3>
            <div className="flex items-center gap-4">
              <button
                onClick={handleExportToCSV}
                disabled={loading || totalCount === 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export to CSV"
              >
                <FileDown className="h-4 w-4" />
                Export to CSV
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <User className="h-4 w-4" />
                Showing {students.length} of {totalCount} students
              </div>
            </div>
          </div>
        </div>
        
        <DataTable
          data={students}
          columns={columns}
          loading={loading}
          emptyMessage="No assigned students found for this form"
        />
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
