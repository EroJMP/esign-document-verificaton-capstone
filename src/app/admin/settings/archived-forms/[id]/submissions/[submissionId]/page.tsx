'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, User, Calendar, FileText } from 'lucide-react';
import PDFViewer from '@/components/pdf/PDFViewer';

type Submission = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  generated_pdf_url: string | null;
  field_values: Array<{
    id: string;
    field_id: string;
    value: string | null;
    signature_url: string | null;
    verified: boolean | null;
  }>;
  users: {
    first_name: string;
    last_name: string;
    email: string;
  };
};

type Form = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  form_fields: Array<{
    id: string;
    field_type: string;
    label: string;
    required: boolean;
  }>;
};

export default function ArchivedSubmissionViewPage({ 
  params 
}: { 
  params: Promise<{ id: string; submissionId: string }> 
}) {
  const [form, setForm] = useState<Form | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { id, submissionId } = await params;
      await Promise.all([
        fetchForm(id),
        fetchSubmission(id, submissionId)
      ]);
    };
    fetchData();
  }, [params]);

  const fetchForm = async (formId: string) => {
    try {
      const response = await fetch(`/api/admin/forms/${formId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch form details');
      }
      const data = await response.json();
      setForm(data.form);
    } catch (error: unknown) {
      setError((error instanceof Error ? error.message : 'An error occurred while fetching form details'));
    }
  };

  const fetchSubmission = async (formId: string, submissionId: string) => {
    try {
      const response = await fetch(`/api/admin/forms/${formId}/submissions/${submissionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch submission details');
      }
      const data = await response.json();
      setSubmission(data.submission);
      
      // Set PDF URL for viewing
      if (data.submission?.generated_pdf_url) {
        // Use the proxy endpoint to avoid CORS issues
        setPdfUrl(`/api/admin/forms/${formId}/submissions/${submissionId}/pdf-proxy`);
      }
    } catch (error: unknown) {
      setError((error as Error).message || 'An error occurred while fetching submission details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSubmission = async () => {
    if (!form || !submission) return;
    
    try {
      const response = await fetch(`/api/admin/forms/${form.id}/submissions/${submission.id}/download`);
      if (!response.ok) {
        throw new Error('Failed to download submission');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submission-${submission.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: unknown) {
      setError((error instanceof Error ? error.message : 'Failed to download submission'));
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFieldValue = (fieldId: string) => {
    if (!submission?.field_values) return null;
    const fieldValue = submission.field_values.find(fv => fv.field_id === fieldId);
    return fieldValue?.value || null;
  };

  const renderFieldValue = (field: { field_type: string; label: string }, value: { value: string | null; signature_url: string | null; verified: boolean | null }) => {
    if (!value) return <span className="text-gray-400 italic">No value</span>;
    
    switch (field.field_type) {
      case 'signature':
        return (
          <div className="mt-2">
            <img 
              src={value} 
              alt="Signature" 
              className="max-w-xs border border-gray-300 rounded"
            />
          </div>
        );
      case 'text':
      case 'email':
      case 'number':
      case 'date':
        return <span className="text-gray-900">{value}</span>;
      default:
        return <span className="text-gray-900">{value}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-2 text-gray-600">Loading submission...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!form || !submission) {
    return (
      <div className="text-center py-12">
        <h3 className="text-sm font-medium text-gray-900">Submission not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The requested submission could not be found.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => router.push(`/admin/settings/archived-forms/${form.id}/submissions`)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Submissions
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {form.title} - Submission Details
            </h1>
            {form.description && (
              <p className="mt-1 text-sm text-gray-600">{form.description}</p>
            )}
          </div>
          <button
            onClick={handleDownloadSubmission}
            disabled={!submission.generated_pdf_url}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Submission Info */}
        <div className="lg:col-span-1 flex-shrink-0">
          <div className="bg-white shadow rounded-lg p-6 h-fit">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Submission Information</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {submission.users.first_name} {submission.users.last_name}
                  </p>
                  <p className="text-sm text-gray-500">{submission.users.email}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Submitted</p>
                  <p className="text-sm text-gray-500">
                    {new Date(submission.created_at).toLocaleDateString()} at{' '}
                    {new Date(submission.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Status</p>
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusBadgeClass(submission.status)}`}>
                    {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <div className="bg-white shadow rounded-lg flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Submission Document</h3>
            </div>
            <div className="flex-1 overflow-hidden">
              {pdfUrl ? (
                <PDFViewer 
                  url={pdfUrl} 
                  className="h-full"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No PDF available for this submission.</p>
                    <p className="text-sm text-gray-400 mt-2">The PDF may still be generating or the submission is incomplete.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
