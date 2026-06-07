'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { FileText, CheckCircle, Clock, Trash2, RefreshCw, Shield, Eye, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Form {
  id: string;
  title: string;
  description: string | null;
  available_from: string | null;
  available_until: string | null;
  status: string;
  submission_status?: 'pending' | 'submitted' | 'verified' | 'rejected' | null;
  submission_id?: string;
  required_forms?: string[];
  rejection_reason?: string | null;
}

type StatusFilter = 'all' | 'pending' | 'submitted' | 'verified' | 'rejected';

export default function StudentPortal() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [deletingSubmission, setDeletingSubmission] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<{id: string, title: string} | null>(null);
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [reasonFormTitle, setReasonFormTitle] = useState<string>('');
  const [reasonText, setReasonText] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  
  const formsPerPage = 5;
  
  // Create supabase client for signOut only
  const supabase = createClient();

  // Show delete confirmation dialog
  const handleDeleteClick = (submissionId: string, formTitle: string) => {
    setSubmissionToDelete({ id: submissionId, title: formTitle });
    setShowDeleteDialog(true);
  };

  const handleShowReason = (formTitle: string, reason?: string | null) => {
    setReasonFormTitle(formTitle);
    setReasonText(reason || 'No specific reason was provided.');
    setShowReasonDialog(true);
  };

  // Delete submission function
  const handleDeleteSubmission = async () => {
    if (!submissionToDelete) return;

    try {
      setDeletingSubmission(submissionToDelete.id);
      setShowDeleteDialog(false);
      
      const response = await fetch(`/api/student/submissions/${submissionToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete submission');
      }

      // Refresh the forms list
      await fetchData();
      
    } catch (error: any) {
      console.error('Error deleting submission:', error);
      setError(`Failed to delete submission: ${error.message}`);
    } finally {
      setDeletingSubmission(null);
      setSubmissionToDelete(null);
    }
  };

  // Refresh page function
  const refreshPage = () => {
    window.location.reload();
  };

  // Sign out function
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Main data fetching function - now uses API route
  const fetchData = async () => {
    try {
      // Fetch dashboard data from API route
      const response = await fetch('/api/student/dashboard');
      
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch dashboard data');
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      // Set user data
      setCurrentUser(data.user);
      
      // Set forms data
      setForms(data.forms || []);
      
    } catch (err: any) {
      console.error('Error in fetchData:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
    
  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Filter forms based on status
  const filteredForms = useMemo(() => {
    if (statusFilter === 'all') {
      return forms;
    }
    return forms.filter(form => {
      if (statusFilter === 'pending') {
        return form.submission_status === 'pending';
      }
      if (statusFilter === 'submitted') {
        return form.submission_status === 'submitted';
      }
      if (statusFilter === 'verified') {
        return form.submission_status === 'verified';
      }
      if (statusFilter === 'rejected') {
        return form.submission_status === 'rejected';
      }
      return true;
    });
  }, [forms, statusFilter]);

  // Paginate filtered forms
  const totalPages = Math.ceil(filteredForms.length / formsPerPage);
  const startIndex = (currentPage - 1) * formsPerPage;
  const endIndex = startIndex + formsPerPage;
  const paginatedForms = filteredForms.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Calculate statistics based on all forms
  const totalForms = forms.length;
  const pendingForms = forms.filter(form => form.submission_status === 'pending').length;
  const submittedForms = forms.filter(form => form.submission_status === 'submitted').length;
  const verifiedForms = forms.filter(form => form.submission_status === 'verified').length;
  const rejectedForms = forms.filter(form => form.submission_status === 'rejected').length;

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-green-500 mb-4"></div>
        <p className="text-xs sm:text-sm text-gray-500">Loading your forms...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-red-700">
              Error loading forms: {error}
            </p>
            <div className="mt-4 flex space-x-3">
              <button
                onClick={refreshPage}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <RefreshCw className="mr-2" /> Refresh
              </button>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-6 sm:mb-8">
        <div className="bg-white overflow-hidden shadow-md rounded-lg border-t-4 border-green-600">
          <div className="p-3 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" aria-hidden="true" />
              </div>
              <div className="ml-2 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Forms</dt>
                  <dd>
                    <div className="text-sm sm:text-lg font-medium text-gray-900">{totalForms}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow-md rounded-lg border-t-4 border-red-600">
          <div className="p-3 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="h-4 w-4 sm:h-6 sm:w-6 text-red-600" aria-hidden="true" />
              </div>
              <div className="ml-2 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-600 truncate">Rejected Forms</dt>
                  <dd>
                    <div className="text-sm sm:text-lg font-medium text-gray-900">{rejectedForms}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow-md rounded-lg border-t-4 border-yellow-500">
          <div className="p-3 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-yellow-500" aria-hidden="true" />
              </div>
              <div className="ml-2 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-600 truncate">Pending Submissions</dt>
                  <dd>
                    <div className="text-sm sm:text-lg font-medium text-gray-900">{pendingForms}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow-md rounded-lg border-t-4 border-green-500">
          <div className="p-3 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6 text-green-500" aria-hidden="true" />
              </div>
              <div className="ml-2 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-600 truncate">Submitted Forms</dt>
                  <dd>
                    <div className="text-sm sm:text-lg font-medium text-gray-900">{submittedForms}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow-md rounded-lg border-t-4 border-blue-600">
          <div className="p-3 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" aria-hidden="true" />
              </div>
              <div className="ml-2 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-600 truncate">Verified Forms</dt>
                  <dd>
                    <div className="text-sm sm:text-lg font-medium text-gray-900">{verifiedForms}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* My Forms Section */}
      <div className="bg-white shadow-md rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 border-l-4 border-green-600">
        {/* Desktop: Title and Filter on same row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          {/* Title Section */}
          <div>
            <h2 className="text-base sm:text-lg font-medium text-green-800 mb-1">My Forms</h2>
            <p className="text-xs sm:text-sm text-gray-600">View and manage your form submissions</p>
          </div>
          
          {/* Desktop Filter - Right corner */}
          <div className="hidden sm:block">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="block rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            >
              <option value="all">All Forms</option>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        
        {/* Mobile: Filter and Pagination row */}
        <div className="flex items-center justify-between gap-2 mb-4 sm:hidden">
          {/* Filter Dropdown - Left on mobile */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="block rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-green-500 focus:outline-none focus:ring-green-500"
          >
            <option value="all">All Forms</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
          
          {/* Mobile Pagination - Right on mobile */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="px-2 py-1 text-xs font-medium text-gray-700">
                {currentPage}/{totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
        
        {filteredForms.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <FileText className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-green-400" />
            <h3 className="mt-2 text-xs sm:text-sm font-medium text-gray-900">
              {statusFilter === 'all' ? 'No forms found' : `No ${statusFilter} forms found`}
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              {statusFilter === 'all' 
                ? "You haven't submitted any forms yet."
                : `You don't have any ${statusFilter} forms.`}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 sm:space-y-6">
              {paginatedForms.map((form) => {
              const isVerified = form.submission_status === 'verified';
              const isSubmitted = form.submission_status === 'submitted';
              const isRejected = form.submission_status === 'rejected';
              const isPending = form.submission_status === 'pending';
              const deadline = form.available_until 
                ? new Date(form.available_until).toLocaleDateString() 
                : null;
                
              return (
                <div key={form.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200">
                  <div className="p-3 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-0">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-lg font-medium text-gray-900 truncate">{form.title}</h3>
                        <p className="mt-1 text-xs sm:text-sm text-gray-600 line-clamp-2">{form.description}</p>
                        
                        {deadline && (
                          <div className="mt-2 flex items-center">
                            <Clock className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-4 sm:w-4 text-gray-500" />
                            <span className="text-xs sm:text-sm text-gray-500">Deadline: {deadline}</span>
                          </div>
                        )}
                        
                        {form.required_forms && form.required_forms.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
                            {form.required_forms.map((requiredForm, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-0.5 sm:px-2.5 rounded-md text-[10px] sm:text-xs font-medium bg-green-100 text-green-800">
                                {requiredForm}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-2 sm:mt-0 flex items-center gap-1.5 sm:space-x-2 flex-shrink-0">
                        {isVerified ? (
                          <span className="inline-flex items-center px-2 py-1 sm:px-3 rounded-md text-xs sm:text-sm font-medium bg-blue-600 text-white" title="Verified">
                            <Shield className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                            <span className="hidden sm:inline">Verified</span>
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center px-2 py-1 sm:px-3 rounded-md text-xs sm:text-sm font-medium bg-red-600 text-white" title="Rejected">
                            <XCircle className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                            <span className="hidden sm:inline">Rejected</span>
                          </span>
                        ) : isSubmitted ? (
                          <span className="inline-flex items-center px-2 py-1 sm:px-3 rounded-md text-xs sm:text-sm font-medium bg-green-600 text-white" title="Submitted">
                            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                            <span className="hidden sm:inline">Submitted</span>
                          </span>
                        ) : isPending ? (
                          <div className="flex gap-1.5 sm:space-x-2">
                            <span className="inline-flex items-center px-2 py-1 sm:px-3 rounded-md text-xs sm:text-sm font-medium bg-yellow-100 text-yellow-800" title="Pending">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                              <span className="hidden sm:inline">Pending</span>
                            </span>
                            <Link 
                              href={`/student/forms/${form.id}?submission=${form.submission_id}`}
                              className="inline-flex items-center justify-center px-2.5 py-1.5 sm:px-4 sm:py-2 border border-green-300 text-xs sm:text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50"
                              title="Continue Form"
                            >
                              <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                              <span>Continue</span>
                            </Link>
                          </div>
                        ) : (
                          <Link 
                            href={`/student/forms/${form.id}`}
                            className="inline-flex items-center justify-center px-2.5 py-1.5 sm:px-4 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                            title="Submit Documents"
                          >
                            <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                            <span>Submit</span>
                          </Link>
                        )}
                        
                        {(isSubmitted || isRejected) && (
                          <>
                            <Link 
                              href={`/student/submissions/${form.submission_id}/confirmation`}
                              className="inline-flex items-center justify-center px-2.5 py-1.5 sm:px-4 sm:py-2 border border-green-300 text-xs sm:text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50"
                              title="View Submission"
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                              <span>View</span>
                            </Link>
                            {isRejected ? (
                              <>
                                <button
                                  onClick={() => handleShowReason(form.title, form.rejection_reason)}
                                  className="inline-flex items-center justify-center px-2.5 py-1.5 sm:px-4 sm:py-2 border border-red-300 text-xs sm:text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                                  title="View Rejection Reason"
                                >
                                  <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                                  <span>Reason</span>
                                </button>
                                <Link
                                  href={`/student/forms/${form.id}?submission=${form.submission_id}&resubmit=1`}
                                  className="inline-flex items-center justify-center px-2.5 py-1.5 sm:px-4 sm:py-2 border border-blue-300 text-xs sm:text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
                                  title="Resubmit Form"
                                >
                                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                                  <span>Resubmit</span>
                                </Link>
                              </>
                            ) : (
                              <button
                                onClick={() => handleDeleteClick(form.submission_id!, form.title)}
                                disabled={deletingSubmission === form.submission_id}
                                className="inline-flex items-center justify-center px-2.5 py-1.5 sm:px-3 sm:py-2 border border-red-300 text-xs sm:text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={deletingSubmission === form.submission_id ? 'Deleting...' : 'Delete Submission'}
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                                <span>{deletingSubmission === form.submission_id ? 'Deleting...' : 'Delete'}</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
            
            {/* Pagination Controls - Desktop Only */}
            {totalPages > 1 && (
              <div className="mt-6 hidden sm:flex sm:items-center sm:justify-between border-t border-gray-200 pt-4">
                <div className="flex flex-1 items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(endIndex, filteredForms.length)}</span> of{' '}
                      <span className="font-medium">{filteredForms.length}</span> forms
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                currentPage === page
                                  ? 'z-10 bg-green-600 text-white focus:z-20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600'
                                  : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return (
                            <span key={page} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && submissionToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 modal-backdrop transition-opacity" onClick={() => setShowDeleteDialog(false)}></div>
            
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">
                      Delete Submission
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete your submission for &quot;<span className="font-medium">{submissionToDelete.title}</span>&quot;? 
                        This action cannot be undone and you will need to resubmit the form.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={handleDeleteSubmission}
                  disabled={deletingSubmission === submissionToDelete.id}
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingSubmission === submissionToDelete.id ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setSubmissionToDelete(null);
                  }}
                  disabled={deletingSubmission === submissionToDelete.id}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Dialog */}
      {showReasonDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 modal-backdrop transition-opacity" onClick={() => setShowReasonDialog(false)}></div>
            
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">
                      Rejection Reason
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Your submission for <span className="font-medium">"{reasonFormTitle}"</span> was rejected for the following reason:
                    </p>
                    <div className="mt-3 rounded-md bg-red-50 p-3 max-h-48 overflow-y-auto">
                      <p className="text-sm text-red-800 whitespace-pre-line">
                        {reasonText}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={() => setShowReasonDialog(false)}
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}