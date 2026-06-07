'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, AlertCircle, Search } from 'lucide-react';
import DataTable, { Column } from '@/components/ui/DataTable';

type Form = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  users: {
    first_name: string;
    last_name: string;
  };
};

export default function ArchivedFormsViewer() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const router = useRouter();
  
  useEffect(() => {
    fetchArchivedForms();
  }, []);
  
  const fetchArchivedForms = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/forms/archived');
      
      if (!response.ok) {
        throw new Error('Failed to fetch archived forms');
      }
      
      const data = await response.json();
      setForms(data.forms || []);
    } catch (error: any) {
      setError(error.message || 'An error occurred while fetching archived forms');
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewSubmissions = (formId: string) => {
    router.push(`/admin/settings/archived-forms/${formId}/submissions`);
  };
  
  const filteredForms = useMemo(() => {
    if (!searchTerm.trim()) {
      return forms;
    }
    const searchLower = searchTerm.toLowerCase();
    return forms.filter(form => 
      form.title.toLowerCase().includes(searchLower) ||
      form.description?.toLowerCase().includes(searchLower) ||
      `${form.users.first_name} ${form.users.last_name}`.toLowerCase().includes(searchLower) ||
      form.status.toLowerCase().includes(searchLower)
    );
  }, [searchTerm, forms]);
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'archived':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const renderActionButtons = (form: Form) => {
    return (
      <div className="flex space-x-2">
        <button
          onClick={() => handleViewSubmissions(form.id)}
          className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
          title="View Submissions"
        >
          <Eye className="h-5 w-5" />
        </button>
      </div>
    );
  };

  const columns: Column<Form>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      className: 'w-2/5',
      render: (form) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{form.title}</div>
          {form.description && (
            <div className="text-sm text-gray-500 truncate max-w-xs">{form.description}</div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      className: 'w-20',
      render: (form) => (
        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusBadgeClass(form.status)}`}>
          {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
        </span>
      )
    },
    {
      key: 'users.first_name',
      header: 'Created By',
      sortable: true,
      className: 'w-32',
      render: (form) => (
        <div className="text-sm text-gray-500">
          {form.users.first_name} {form.users.last_name}
        </div>
      )
    },
    {
      key: 'created_at',
      header: 'Created At',
      sortable: true,
      className: 'w-28',
      render: (form) => (
        <div className="text-sm text-gray-500">
          {new Date(form.created_at).toLocaleDateString()}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-32 text-right',
      render: (form) => renderActionButtons(form)
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-2 text-gray-600">Loading archived forms...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Messages */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search archived forms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 text-sm"
        />
      </div>

      {/* Forms Data Table */}
      {filteredForms.length === 0 && !searchTerm ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="mb-4 text-gray-500">No archived forms found. Archived forms will appear here when forms are archived from the main forms page.</p>
        </div>
      ) : filteredForms.length === 0 && searchTerm ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="mb-4 text-gray-500">No archived forms found matching &quot;{searchTerm}&quot;</p>
          <button
            onClick={() => setSearchTerm('')}
            className="inline-flex items-center rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <DataTable
          data={filteredForms}
          columns={columns}
          loading={loading}
          emptyMessage="No archived forms found. Archived forms will appear here when forms are archived from the main forms page."
        />
      )}
    </div>
  );
}
