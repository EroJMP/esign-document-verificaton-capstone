'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Users, Archive, Play, Search, BarChart3, FileText, User, CheckCircle, Clock, AlertCircle, Calendar } from 'lucide-react';
import DataTable, { Column } from '@/components/ui/DataTable';

type Form = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  available_from: string | null;
  available_until: string | null;
  users: {
    first_name: string;
    last_name: string;
  };
};

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [filteredForms, setFilteredForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const [submissionCount, setSubmissionCount] = useState<number>(0);
  const [isLoadingSubmissionCount, setIsLoadingSubmissionCount] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [formToArchive, setFormToArchive] = useState<Form | null>(null);
  
  const router = useRouter();
  const limit = 10;
  
  useEffect(() => {
    fetchForms();
  }, [page]);

  // Filter forms based on search term (excluding completed forms)
  useEffect(() => {
    // Ensure completed forms are always filtered out
    const nonCompletedForms = forms.filter(form => form.status !== 'completed');
    
    if (!searchTerm.trim()) {
      setFilteredForms(nonCompletedForms);
    } else {
      const filtered = nonCompletedForms.filter(form => {
        const searchLower = searchTerm.toLowerCase();
        const availableFromStr = form.available_from 
          ? new Date(form.available_from).toLocaleDateString().toLowerCase()
          : '';
        const availableUntilStr = form.available_until 
          ? new Date(form.available_until).toLocaleDateString().toLowerCase()
          : '';
        
        return (
          form.title.toLowerCase().includes(searchLower) ||
          form.description?.toLowerCase().includes(searchLower) ||
          `${form.users.first_name} ${form.users.last_name}`.toLowerCase().includes(searchLower) ||
          form.status.toLowerCase().includes(searchLower) ||
          availableFromStr.includes(searchLower) ||
          availableUntilStr.includes(searchLower)
        );
      });
      setFilteredForms(filtered);
    }
  }, [searchTerm, forms]);
  
  const fetchForms = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching forms (auto-completion will happen in API)...');
      
      const response = await fetch(`/api/admin/forms?page=${page}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch forms');
      }
      
      const data = await response.json();
      // Filter out completed forms from the forms list
      const filteredData = (data.forms || []).filter((form: Form) => form.status !== 'completed');
      setForms(filteredData);
      setFilteredForms(filteredData);
      setTotalPages(data.pagination?.pages || 1);
      
      console.log('✅ Forms loaded successfully');
    } catch (error: unknown) {
      setError((error as Error).message || 'An error occurred while fetching forms');
    } finally {
      setLoading(false);
    }
  };


  
  // Replace the handleCreateForm function with a navigation to the wizard
  const handleCreateForm = () => {
    router.push('/admin/forms/create');
  };
  
  const openDeleteModal = async (form: Form) => {
    setFormToDelete(form);
    setIsDeleteModalOpen(true);
    setIsLoadingSubmissionCount(true);
    
    // Fetch submission count for this form
    try {
      const response = await fetch(`/api/admin/forms/${form.id}/submissions?page=1&limit=1`);
      if (response.ok) {
        const data = await response.json();
        setSubmissionCount(data.pagination?.total || 0);
      } else {
        setSubmissionCount(0);
      }
    } catch {
      setSubmissionCount(0);
    } finally {
      setIsLoadingSubmissionCount(false);
    }
  };
  
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setFormToDelete(null);
    setSubmissionCount(0);
  };
  
  const handleDeleteForm = async () => {
    if (!formToDelete) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/forms/${formToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete form');
      }
      
      // Refresh the forms list
      fetchForms();
      closeDeleteModal();
    } catch (error: unknown) {
      setError((error as Error).message || 'An error occurred while deleting the form');
    } finally {
      setLoading(false);
    }
  };

  const openArchiveModal = (form: Form) => {
    setFormToArchive(form);
    setIsArchiveModalOpen(true);
  };

  const closeArchiveModal = () => {
    setIsArchiveModalOpen(false);
    setFormToArchive(null);
  };

  const handleArchiveForm = async () => {
    if (!formToArchive) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/forms/${formToArchive.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'archived'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to archive form');
      }
      
      // Refresh the forms list
      fetchForms();
      closeArchiveModal();
    } catch (error: unknown) {
      setError((error as Error).message || 'An error occurred while archiving the form');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueForm = (formId: string) => {
    // Redirect to create page with form ID to continue editing
    router.push(`/admin/forms/create?continue=${formId}`);
  };

  const handleEditForm = (formId: string) => {
    router.push(`/admin/forms/${formId}`);
  };

  const handleViewSubmissions = (formId: string) => {
    router.push(`/admin/forms/${formId}/submissions`);
  };

  const handleViewReport = (formId: string) => {
    router.push(`/admin/reports?formId=${formId}`);
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'active':
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'archived':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return Clock;
      case 'active':
      case 'published':
        return CheckCircle;
      case 'inactive':
        return AlertCircle;
      case 'archived':
        return Archive;
      case 'completed':
        return CheckCircle;
      default:
        return Clock;
    }
  };

  const renderActionButtons = (form: Form) => {
    const isDraft = form.status === 'draft';
    const isPublishedOrActive = ['published', 'active', 'inactive'].includes(form.status);
    const isCompleted = form.status === 'completed';

    if (isDraft) {
      return (
        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => handleContinueForm(form.id)}
            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
            title="Continue Form Creation"
          >
            <Play className="h-5 w-5" />
          </button>
          <button
            onClick={() => openDeleteModal(form)}
            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
            title="Delete Form"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      );
    }

    if (isCompleted) {
      return (
        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => handleEditForm(form.id)}
            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
            title="Edit Form"
          >
            <Edit2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleViewReport(form.id)}
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
            title="View Report"
          >
            <BarChart3 className="h-5 w-5" />
          </button>
        </div>
      );
    }

    if (isPublishedOrActive) {
      return (
        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => handleEditForm(form.id)}
            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
            title="Edit Form"
          >
            <Edit2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleViewSubmissions(form.id)}
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
            title="View Submissions"
          >
            <Users className="h-5 w-5" />
          </button>
          <button
            onClick={() => openDeleteModal(form)}
            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
            title="Delete Form"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      );
    }

    return null;
  };

  const columns: Column<Form>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      className: 'w-40', 
      render: (form) => (
        <div className="flex items-center space-x-2">
          <FileText className="h-6 w-6 text-gray-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-900">{form.title}</div>
            {form.description && (
              <div className="text-sm text-gray-500 truncate max-w-xs">{form.description}</div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      className: 'w-20', 
      render: (form) => {
        const Icon = getStatusIcon(form.status);
        return (
          <span className={`inline-flex items-center rounded-full px-2 text-xs font-semibold leading-5 ${getStatusBadgeClass(form.status)}`}>
            <Icon className="w-3 h-3 mr-1" />
            {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
          </span>
        );
      }
    },
    {
      key: 'users.first_name',
      header: 'Created By',
      sortable: true,
      className: 'w-32', 
      render: (form) => (
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="text-sm text-gray-500">
            {form.users.first_name} {form.users.last_name}
          </div>
        </div>
      )
    },
    {
      key: 'created_at',
      header: 'Created At',
      sortable: true,
      className: 'w-28', 
      render: (form) => (
        <div className="flex items-center space-x-1 text-sm text-gray-500">
          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span>
            {new Date(form.created_at).toLocaleDateString()}
          </span>
        </div>
      )
    },
    {
      key: 'available_from',
      header: 'Available From',
      sortable: true,
      className: 'w-36', 
      render: (form) => (
        <div className="flex items-center space-x-1 text-sm text-gray-500">
          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span>
            {form.available_from 
              ? new Date(form.available_from).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })
              : <span className="text-gray-400 italic">Not set</span>
            }
          </span>
        </div>
      )
    },
    {
      key: 'available_until',
      header: 'Available Until',
      sortable: true,
      className: 'w-36', 
      render: (form) => {
        const isExpired = form.available_until 
          ? new Date(form.available_until) < new Date()
          : false;
        
        return (
          <div className="flex items-center space-x-1 text-sm">
            <Calendar className={`h-4 w-4 flex-shrink-0 ${isExpired ? 'text-red-400' : 'text-gray-400'}`} />
            <span className={isExpired ? 'text-red-600 font-medium' : 'text-gray-500'}>
              {form.available_until 
                ? new Date(form.available_until).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })
                : <span className="text-gray-400 italic">Not set</span>
              }
            </span>
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-32 text-right',
      render: (form) => renderActionButtons(form)
    }
  ];
  
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Forms Management</h1>
        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search forms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 text-sm"
            />
          </div>
          {/* Create Form Button */}
          <button
            onClick={handleCreateForm}
            disabled={loading}
            className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <Plus className="mr-2" />
            Create Form
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
          <p>{error}</p>
        </div>
      )}
      
      {loading && filteredForms.length === 0 ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-gray-500">Loading forms...</p>
        </div>
      ) : filteredForms.length === 0 && !searchTerm ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="mb-4 text-gray-500">No forms found</p>
          <button
            onClick={handleCreateForm}
            className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <Plus className="mr-2" />
            Create your first form
          </button>
        </div>
      ) : filteredForms.length === 0 && searchTerm ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="mb-4 text-gray-500">No forms found matching &quot;{searchTerm}&quot;</p>
          <button
            onClick={() => setSearchTerm('')}
            className="inline-flex items-center rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <>
          <DataTable
            data={filteredForms}
            columns={columns}
            loading={loading}
            emptyMessage="No forms found"
          />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${
                    page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${
                    page === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing page <span className="font-medium">{page}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ${
                        page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                          pageNum === page
                            ? 'z-10 bg-green-600 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600'
                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ${
                        page === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && formToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="delete-modal-title" role="dialog" aria-modal="true">
          {/* Background overlay */}
          <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
            {/* Background overlay, show/hide based on modal state */}
            <div 
              className="fixed inset-0 modal-backdrop transition-opacity" 
              aria-hidden="true"
              onClick={closeDeleteModal}
            ></div>

            {/* This element is to trick the browser into centering the modal contents */}
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

            {/* Modal panel */}
            <div className="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900" id="delete-modal-title">
                      Delete Form
                    </h3>
                    <div className="mt-2">
                      {isLoadingSubmissionCount ? (
                        <p className="text-sm text-gray-500">Loading...</p>
                      ) : submissionCount > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-900">
                            Are you sure you want to delete the form &quot;{formToDelete.title}&quot;?
                          </p>
                          <div className="rounded-md bg-red-50 p-3">
                            <p className="text-sm font-medium text-red-800">
                              ⚠️ Warning: This form has {submissionCount} submission{submissionCount !== 1 ? 's' : ''}.
                            </p>
                            <p className="mt-1 text-sm text-red-700">
                              Deleting this form will permanently delete all {submissionCount} submission{submissionCount !== 1 ? 's' : ''} made by students. This action cannot be undone.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Are you sure you want to delete the form &quot;{formToDelete.title}&quot;? This action cannot be undone.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleDeleteForm}
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={closeDeleteModal}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {isArchiveModalOpen && formToArchive && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          {/* Background overlay */}
          <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
            {/* Background overlay, show/hide based on modal state */}
            <div 
              className="fixed inset-0 modal-backdrop transition-opacity" 
              aria-hidden="true"
              onClick={closeArchiveModal}
            ></div>

            {/* This element is to trick the browser into centering the modal contents */}
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

            {/* Modal panel */}
            <div className="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Archive className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                      Archive Form
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to archive the form &quot;{formToArchive.title}&quot;? This will hide it from the main forms list, but it can be restored later.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-yellow-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleArchiveForm}
                  disabled={loading}
                >
                  {loading ? 'Archiving...' : 'Archive'}
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={closeArchiveModal}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 