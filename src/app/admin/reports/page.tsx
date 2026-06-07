'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw, User, CheckCircle, FileText, Eye, Search, Archive, Shield } from 'lucide-react';

interface CompletedForm {
  id: string;
  title: string;
  description: string | null;
  available_until: string;
  status: string;
  created_at: string;
  completed_date: string | null;
  users: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  submission_stats: {
    verified: number;
    submitted: number;
    in_progress: number;
    total: number;
    no_submission: number;
  };
}

interface CompletedFormsResponse {
  completedForms: CompletedForm[];
  count: number;
  message: string;
}

export default function ReportsPage() {
  const [completedForms, setCompletedForms] = useState<CompletedForm[]>([]);
  const [filteredForms, setFilteredForms] = useState<CompletedForm[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [formToArchive, setFormToArchive] = useState<CompletedForm | null>(null);
  const [archiving, setArchiving] = useState(false);
  const router = useRouter();

  const fetchCompletedForms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/reports/completed-forms', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch completed forms');
      }

      const data: CompletedFormsResponse = await response.json();
      setCompletedForms(data.completedForms || []);
      setFilteredForms(data.completedForms || []);
      setLastChecked(new Date());
    } catch (error: any) {
      setError(error.message || 'An error occurred while fetching completed forms');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubmissions = (formId: string) => {
    router.push(`/admin/reports/${formId}/submissions`);
  };

  const openArchiveModal = (form: CompletedForm) => {
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
      setArchiving(true);
      setError(null);
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to archive form');
      }
      
      // Refresh the forms list
      await fetchCompletedForms();
      closeArchiveModal();
    } catch (error: any) {
      setError(error.message || 'An error occurred while archiving the form');
    } finally {
      setArchiving(false);
    }
  };

  useEffect(() => {
    fetchCompletedForms();
  }, []);

  // Filter forms based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredForms(completedForms || []);
    } else {
      const filtered = (completedForms || []).filter(form => 
        form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        form.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${form.users?.first_name || ''} ${form.users?.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredForms(filtered);
    }
  }, [searchTerm, completedForms]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <FileText className="mr-3 h-6 w-6 text-blue-600" />
          Completed Forms Report
        </h1>
        <p className="text-gray-600 mt-1">
          View and manage completed forms with submission statistics
        </p>
      </div>

      {/* Total Completed Forms Card */}
      <div className="mb-6">
        <div className="w-full sm:w-1/3 lg:w-1/4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Completed Forms</p>
                <p className="text-2xl font-bold text-gray-900">{completedForms?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search forms by title, description, or creator..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-8">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Loading completed forms...</p>
        </div>
      ) : (completedForms?.length || 0) === 0 ? (
        <div className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No completed forms</h3>
          <p className="mt-1 text-sm text-gray-500">
            No forms have been marked as completed yet.
          </p>
        </div>
      ) : filteredForms.length === 0 && searchTerm ? (
        <div className="text-center py-8">
          <Search className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No forms found</h3>
          <p className="mt-1 text-sm text-gray-500">
            No forms match your search criteria "{searchTerm}".
          </p>
        </div>
      ) : (
        /* Forms Table */
        <div className="overflow-hidden shadow-sm ring-1 ring-gray-200 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Form Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Verified Forms
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted Forms
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No Submission/Incomplete
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredForms.map((form) => (
                <tr key={form.id} className="group hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {form.title}
                      </div>
                      {form.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {form.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        Created by: {form.users ? 
                          `${form.users.first_name || ''} ${form.users.last_name || ''}`.trim() || 'Unknown' :
                          'Unknown'
                        }
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {form.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Shield className="mr-2 h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-600">
                        {form.submission_stats.verified}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="mr-2 h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-green-600">
                        {form.submission_stats.submitted}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium text-orange-600">
                        {form.submission_stats.in_progress + form.submission_stats.no_submission}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => handleViewSubmissions(form.id)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                        title="View Submissions"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => openArchiveModal(form)}
                        className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded"
                        title="Archive Form"
                      >
                        <Archive className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {isArchiveModalOpen && formToArchive && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 modal-backdrop transition-opacity" onClick={closeArchiveModal}></div>
            
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Archive className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">
                      Archive Form
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to archive &quot;<span className="font-medium">{formToArchive.title}</span>&quot;? 
                        This form will be moved to archived forms and will no longer appear in the active forms list.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={handleArchiveForm}
                  disabled={archiving}
                  className="inline-flex w-full justify-center rounded-md bg-yellow-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {archiving ? 'Archiving...' : 'Archive'}
                </button>
                <button
                  type="button"
                  onClick={closeArchiveModal}
                  disabled={archiving}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
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
